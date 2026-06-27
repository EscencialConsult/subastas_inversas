namespace SICST.Application.Common.Interfaces;

public interface IAuctionBidLock
{
    Task<IDisposable> AcquireAsync(Guid auctionId, CancellationToken cancellationToken);
}
