using SICST.Application.Public.DTOs;

namespace SICST.Application.Common.Interfaces;

public interface IPublicAuctionSnapshotCache
{
    Task SetAsync(PublicAuctionSnapshotDto snapshot, CancellationToken cancellationToken);
    Task<PublicAuctionSnapshotDto?> GetAsync(Guid auctionId, CancellationToken cancellationToken);
    Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken);
}
