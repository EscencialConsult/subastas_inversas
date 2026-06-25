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
        return await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Bids)
            .Where(a => a.PurchaseProcessId == request.PurchaseProcessId)
            .Select(a => new PublicAuctionDto
            {
                Id = a.Id,
                PurchaseProcessId = a.PurchaseProcessId,
                CompanyId = a.CompanyId,
                CompanyName = a.PurchaseProcess.Company.Name,
                ProcessCode = a.PurchaseProcess.Code,
                ProcessTitle = a.PurchaseProcess.Title,
                BasePrice = a.BasePrice,
                CurrentPrice = a.Bids.Any() ? a.Bids.Min(b => b.Amount) : a.BasePrice,
                Status = a.Status,
                StartsAtUtc = a.StartsAtUtc,
                EndsAtUtc = a.EndsAtUtc,
                BidCount = a.Bids.Count,
                EventsUrl = $"/api/public/auctions/{a.Id}/events"
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}
