namespace SICST.Domain.Entities;

public enum InvitationStatus
{
    Pending,
    Accepted,
    Rejected
}

public enum QualificationStatus
{
    Pending,
    Approved,
    Observed,
    Rejected
}

public class Invitation
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }

    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public InvitationStatus Status { get; set; } = InvitationStatus.Pending;

    public DateTime InvitedAtUtc { get; set; }

    public string? RejectionReason { get; set; }

    public QualificationStatus? QualificationStatus { get; set; }

    public string? QualificationNotes { get; set; }

    public Guid? QualifiedById { get; set; }

    public User? QualifiedBy { get; set; }

    public DateTime? QualifiedAtUtc { get; set; }
}
