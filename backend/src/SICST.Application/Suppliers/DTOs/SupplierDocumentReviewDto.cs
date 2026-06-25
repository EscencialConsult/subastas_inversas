using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.DTOs;

public class SupplierDocumentReviewDto
{
    public Guid Id { get; set; }
    public Guid SupplierDocumentId { get; set; }
    public Guid? ReviewerId { get; set; }
    public SupplierDocumentReviewAction Action { get; set; }
    public SupplierDocumentVerdict? Verdict { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string? ExceptionReason { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
