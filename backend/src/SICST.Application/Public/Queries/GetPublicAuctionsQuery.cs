using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public.Queries;

public record GetPublicAuctionsQuery(Guid? CompanyId = null) : IRequest<List<PublicAuctionDto>>;

public class GetPublicAuctionsQueryHandler : IRequestHandler<GetPublicAuctionsQuery, List<PublicAuctionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPublicAuctionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PublicAuctionDto>> Handle(GetPublicAuctionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Bids)
            .Where(a => a.PurchaseProcess.Status != PurchaseProcessStatus.Draft
                && a.PurchaseProcess.Status != PurchaseProcessStatus.Rejected);

        if (request.CompanyId.HasValue)
        {
            query = query.Where(a => a.CompanyId == request.CompanyId.Value);
        }

        return await query
            .OrderByDescending(a => a.EndsAtUtc)
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
