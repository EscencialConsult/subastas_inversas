using System.Collections.Concurrent;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Auctions;

public class InMemoryAuctionBidLock : IAuctionBidLock
{
    private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> Locks = new();

    public async Task<IDisposable> AcquireAsync(Guid auctionId, CancellationToken cancellationToken)
    {
        var semaphore = Locks.GetOrAdd(auctionId, _ => new SemaphoreSlim(1, 1));
        await semaphore.WaitAsync(cancellationToken);
        return new Releaser(semaphore);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _semaphore;
        private bool _disposed;

        public Releaser(SemaphoreSlim semaphore)
        {
            _semaphore = semaphore;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _semaphore.Release();
            _disposed = true;
        }
    }
}
