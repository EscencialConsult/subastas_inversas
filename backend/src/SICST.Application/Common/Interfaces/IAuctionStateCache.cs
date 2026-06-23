namespace SICST.Application.Common.Interfaces;

public record AuctionState(Guid AuctionId, decimal CurrentPrice, DateTime EndsAtUtc, bool IsOpen);

public interface IAuctionStateCache
{
    Task SetAsync(AuctionState state, CancellationToken cancellationToken);
    Task<AuctionState?> GetAsync(Guid auctionId, CancellationToken cancellationToken);
    Task RemoveAsync(Guid auctionId, CancellationToken cancellationToken);
}
