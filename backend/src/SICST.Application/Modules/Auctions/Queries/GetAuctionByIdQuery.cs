using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Auctions.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Auctions.Queries;

public record GetAuctionByIdQuery(Guid AuctionId) : IRequest<AuctionDto?>;

public class GetAuctionByIdQueryHandler : IRequestHandler<GetAuctionByIdQuery, AuctionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetAuctionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AuctionDto?> Handle(GetAuctionByIdQuery request, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId, cancellationToken);

        return auction == null ? null : AuctionMapping.ToDto(auction);
    }
}
