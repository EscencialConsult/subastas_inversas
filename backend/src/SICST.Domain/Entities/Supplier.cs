namespace SICST.Domain.Entities;

public enum SupplierStatus
{
    Pending,
    Verified,
    Rejected
}

public enum ArcaVerificationStatus
{
    Pending,
    Verified,
    Rejected,
    Failed
}

public class Supplier
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public User User { get; set; } = null!;

    public string Cuit { get; set; } = string.Empty;

    public string BusinessName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string BusinessCategory { get; set; } = string.Empty;

    public string Province { get; set; } = string.Empty;

    public string Locality { get; set; } = string.Empty;

    public SupplierStatus Status { get; set; } = SupplierStatus.Pending;

    public bool ArcaVerified { get; set; }

    public ArcaVerificationStatus ArcaVerificationStatus { get; set; } = ArcaVerificationStatus.Pending;

    public DateTime? ArcaVerifiedAtUtc { get; set; }

    public string? ArcaVerificationNotes { get; set; }

    public DateTime? CredentialsSentAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
