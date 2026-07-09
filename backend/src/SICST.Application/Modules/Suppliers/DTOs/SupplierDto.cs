using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.DTOs;

public enum SupplierReadinessStatus
{
    Ready,
    NeedsReview,
    Blocked
}

public class SupplierDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Cuit { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string BusinessCategory { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Locality { get; set; } = string.Empty;
    public SupplierStatus Status { get; set; }
    public bool ArcaVerified { get; set; }
    public ArcaVerificationStatus ArcaVerificationStatus { get; set; }
    public DateTime? ArcaVerifiedAtUtc { get; set; }
    public string? ArcaVerificationNotes { get; set; }
    public string? ArcaBusinessName { get; set; }
    public string? ArcaFiscalAddress { get; set; }
    public string? ArcaIvaCondition { get; set; }
    public int? ArcaBusinessNameMatchScore { get; set; }
    public DateTime? ArcaVerificationExpiresAtUtc { get; set; }
    public DateTime? CredentialsSentAtUtc { get; set; }
    public int DocumentsTotal { get; set; }
    public int DocumentsApproved { get; set; }
    public int DocumentsRejected { get; set; }
    public int DocumentsExpired { get; set; }
    public int DocumentsPendingReview { get; set; }
    public DateTime? LastCompanyReviewAtUtc { get; set; }
    public string? LastCompanyReviewNotes { get; set; }
    public SupplierReadinessStatus ReadinessStatus { get; set; }
    public CompanySupplierStatus? CompanySupplierStatus { get; set; }
    public string? CompanySupplierWarning { get; set; }
    public bool? CompanySupplierStrictPolicy { get; set; }
}
