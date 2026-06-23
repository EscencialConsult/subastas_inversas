using System.Collections.Concurrent;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Auctions;

public class InMemoryAuctionStateCache : IAuctionStateCache
{
    private readonly ConcurrentDictionary<Guid, AuctionState> _states = new();

    public Task SetAsync(AuctionState state, CancellationToken cancellationToken)
    {
        _states[state.AuctionId] = state;
        return Task.CompletedTask;
    }

    public Task<AuctionState?> GetAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        _states.TryGetValue(auctionId, out var state);
        return Task.FromResult(state);
    }

    public Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        _states.TryRemove(auctionId, out _);
        return Task.CompletedTask;
    }
}
