using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;

namespace SICST.Application.Public.Queries;

public record GetPublicAuctionSnapshotQuery(Guid AuctionId) : IRequest<PublicAuctionSnapshotDto?>;

public class GetPublicAuctionSnapshotQueryHandler
    : IRequestHandler<GetPublicAuctionSnapshotQuery, PublicAuctionSnapshotDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPublicAuctionSnapshotCache _snapshotCache;

    public GetPublicAuctionSnapshotQueryHandler(
        IApplicationDbContext context,
        IPublicAuctionSnapshotCache snapshotCache)
    {
        _context = context;
        _snapshotCache = snapshotCache;
    }

    public async Task<PublicAuctionSnapshotDto?> Handle(
        GetPublicAuctionSnapshotQuery request,
        CancellationToken cancellationToken)
    {
        var cached = await _snapshotCache.GetAsync(request.AuctionId, cancellationToken);
        if (cached != null)
        {
            return cached;
        }

        var auction = await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants).ThenInclude(p => p.Supplier)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId, cancellationToken);

        if (auction == null)
        {
            return null;
        }

        var snapshot = PublicAuctionSnapshotMapping.ToSnapshot(auction);
        await _snapshotCache.SetAsync(snapshot, cancellationToken);
        return snapshot;
    }
}
