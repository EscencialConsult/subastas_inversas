namespace SICST.Application.Common.Events;

public sealed record PurchaseProcessPublished(
    Guid EventId,
    Guid CompanyId,
    Guid PurchaseProcessId,
    string ProcessCode,
    DateTime PublishedAtUtc,
    DateTime OccurredAtUtc) : IApplicationEvent
{
    Guid? IApplicationEvent.CompanyId => CompanyId;

    public string IdempotencyKey => $"{nameof(PurchaseProcessPublished)}:{PurchaseProcessId}";
}
