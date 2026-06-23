using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public.Queries;

public record GetPublicLiveAuctionsQuery(Guid? CompanyId = null) : IRequest<List<PublicAuctionDto>>;

public class GetPublicLiveAuctionsQueryHandler : IRequestHandler<GetPublicLiveAuctionsQuery, List<PublicAuctionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPublicLiveAuctionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PublicAuctionDto>> Handle(GetPublicLiveAuctionsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var query = _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Bids)
            .Where(a => a.Status == AuctionStatus.Open && a.StartsAtUtc <= now && a.EndsAtUtc >= now);

        if (request.CompanyId.HasValue)
        {
            query = query.Where(a => a.CompanyId == request.CompanyId.Value);
        }

        return await query
            .OrderBy(a => a.EndsAtUtc)
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
            .ToListAsync(cancellationToken);
    }
}
