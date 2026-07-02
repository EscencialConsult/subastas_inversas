namespace SICST.Application.Common.Events;

public sealed record AuctionStarted(
    Guid EventId,
    Guid CompanyId,
    Guid PurchaseProcessId,
    Guid AuctionId,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    DateTime OccurredAtUtc) : IApplicationEvent
{
    Guid? IApplicationEvent.CompanyId => CompanyId;

    public string IdempotencyKey => $"{nameof(AuctionStarted)}:{AuctionId}";
}
