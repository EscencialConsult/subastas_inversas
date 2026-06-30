using System.Collections.Concurrent;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;

namespace SICST.Infrastructure.Auctions;

public class InMemoryPublicAuctionSnapshotCache : IPublicAuctionSnapshotCache
{
    private readonly ConcurrentDictionary<Guid, PublicAuctionSnapshotDto> _snapshots = new();

    public Task SetAsync(PublicAuctionSnapshotDto snapshot, CancellationToken cancellationToken)
    {
        _snapshots[snapshot.Id] = snapshot;
        return Task.CompletedTask;
    }

    public Task<PublicAuctionSnapshotDto?> GetAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        _snapshots.TryGetValue(auctionId, out var snapshot);
        return Task.FromResult(snapshot);
    }

    public Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        _snapshots.TryRemove(auctionId, out _);
        return Task.CompletedTask;
    }
}
