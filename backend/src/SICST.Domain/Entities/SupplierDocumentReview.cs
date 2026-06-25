namespace SICST.Domain.Entities;

public enum SupplierDocumentReviewAction
{
    Observation,
    Remediation,
    Verdict,
    Exception
}

public enum SupplierDocumentVerdict
{
    Approved,
    Rejected,
    ApprovedWithException
}

public class SupplierDocumentReview
{
    public Guid Id { get; set; }

    public Guid SupplierDocumentId { get; set; }

    public SupplierDocument SupplierDocument { get; set; } = null!;

    public Guid? ReviewerId { get; set; }

    public User? Reviewer { get; set; }

    public SupplierDocumentReviewAction Action { get; set; }

    public SupplierDocumentVerdict? Verdict { get; set; }

    public string Notes { get; set; } = string.Empty;

    public string? ExceptionReason { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
