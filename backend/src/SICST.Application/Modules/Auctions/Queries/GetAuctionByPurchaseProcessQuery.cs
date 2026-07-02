using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Auctions.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Auctions.Queries;

public record GetAuctionByPurchaseProcessQuery(Guid CompanyId, Guid PurchaseProcessId) : IRequest<AuctionDto?>;

public class GetAuctionByPurchaseProcessQueryHandler : IRequestHandler<GetAuctionByPurchaseProcessQuery, AuctionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetAuctionByPurchaseProcessQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AuctionDto?> Handle(GetAuctionByPurchaseProcessQuery request, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.CompanyId == request.CompanyId && a.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);

        return auction == null ? null : AuctionMapping.ToDto(auction);
    }
}
