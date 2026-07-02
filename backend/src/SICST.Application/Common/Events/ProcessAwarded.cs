namespace SICST.Application.Common.Events;

public sealed record ProcessAwarded(
    Guid EventId,
    Guid CompanyId,
    Guid PurchaseProcessId,
    IReadOnlyCollection<Guid> AwardIds,
    decimal TotalAmount,
    DateTime AwardedAtUtc,
    DateTime OccurredAtUtc) : IApplicationEvent
{
    Guid? IApplicationEvent.CompanyId => CompanyId;

    public string IdempotencyKey => $"{nameof(ProcessAwarded)}:{PurchaseProcessId}";
}
