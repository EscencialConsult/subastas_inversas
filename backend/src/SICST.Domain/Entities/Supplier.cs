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
    Failed,
    PendingManualReview
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

    public string? ArcaBusinessName { get; set; }

    public string? ArcaPersonType { get; set; }

    public string? ArcaIvaCondition { get; set; }

    public int? ArcaIvaConditionId { get; set; }

    public string? ArcaMonotributoCategory { get; set; }

    public int? ArcaEmployeeCount { get; set; }

    public string? ArcaFiscalAddress { get; set; }

    public string? ArcaFiscalCity { get; set; }

    public string? ArcaFiscalProvince { get; set; }

    public string? ArcaRawData { get; set; }

    public DateTime? CredentialsSentAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public int? ArcaBusinessNameMatchScore { get; set; }

    public DateTime? ArcaVerificationExpiresAtUtc { get; set; }

    public DateTime? ArcaLastRenewalAttemptAtUtc { get; set; }
}
