using SICST.Domain.Entities;

namespace SICST.Application.Purchases.DTOs;

public class InvitationDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid SupplierId { get; set; }
    public InvitationStatus Status { get; set; }
    public DateTime InvitedAtUtc { get; set; }
    public string SupplierBusinessName { get; set; } = string.Empty;
    public string SupplierCuit { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public string ProcessCode { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public QualificationStatus? QualificationStatus { get; set; }
    public string? QualificationNotes { get; set; }
    public Guid? QualifiedById { get; set; }
    public string? QualifiedByName { get; set; }
    public DateTime? QualifiedAtUtc { get; set; }
}
