using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;

namespace SICST.Application.Public.Queries;

public record GetPublicAuctionByPurchaseProcessQuery(Guid PurchaseProcessId) : IRequest<PublicAuctionDto?>;

public class GetPublicAuctionByPurchaseProcessQueryHandler
    : IRequestHandler<GetPublicAuctionByPurchaseProcessQuery, PublicAuctionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPublicAuctionByPurchaseProcessQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicAuctionDto?> Handle(
        GetPublicAuctionByPurchaseProcessQuery request,
        CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants).ThenInclude(p => p.Supplier)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Where(a => a.PurchaseProcessId == request.PurchaseProcessId)
            .FirstOrDefaultAsync(cancellationToken);

        if (auction == null)
        {
            return null;
        }

        var snapshot = PublicAuctionSnapshotMapping.ToSnapshot(auction);
        return new PublicAuctionDto
        {
            Id = snapshot.Id,
            PurchaseProcessId = snapshot.PurchaseProcessId,
            CompanyId = snapshot.CompanyId,
            CompanyName = snapshot.CompanyName,
            ProcessCode = snapshot.ProcessCode,
            ProcessTitle = snapshot.ProcessTitle,
            BasePrice = snapshot.BasePrice,
            CurrentPrice = snapshot.CurrentPrice,
            Status = snapshot.Status,
            StartsAtUtc = snapshot.StartsAtUtc,
            EndsAtUtc = snapshot.EndsAtUtc,
            BidCount = snapshot.BidCount,
            EventsUrl = $"/api/public/auctions/{snapshot.Id}/events",
            IdentitiesRevealed = snapshot.IdentitiesRevealed,
            Ranking = snapshot.Ranking
        };
    }
}
