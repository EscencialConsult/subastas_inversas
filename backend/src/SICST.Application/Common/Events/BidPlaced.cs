namespace SICST.Application.Common.Events;

public sealed record BidPlaced(
    Guid EventId,
    Guid CompanyId,
    Guid AuctionId,
    Guid BidId,
    Guid SupplierId,
    decimal Amount,
    int SequenceNumber,
    DateTime PlacedAtUtc,
    DateTime OccurredAtUtc) : IApplicationEvent
{
    Guid? IApplicationEvent.CompanyId => CompanyId;

    public string IdempotencyKey => $"{nameof(BidPlaced)}:{BidId}";
}
