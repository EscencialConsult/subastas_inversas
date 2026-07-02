namespace SICST.Application.Common.Events;

public sealed record SupplierInvited(
    Guid EventId,
    Guid CompanyId,
    Guid PurchaseProcessId,
    Guid SupplierId,
    Guid InvitationId,
    DateTime InvitedAtUtc,
    DateTime OccurredAtUtc) : IApplicationEvent
{
    Guid? IApplicationEvent.CompanyId => CompanyId;

    public string IdempotencyKey => $"{nameof(SupplierInvited)}:{InvitationId}";
}
