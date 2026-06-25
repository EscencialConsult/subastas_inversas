using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.DTOs;

public class SupplierDocumentDto
{
    public Guid Id { get; set; }
    public Guid SupplierId { get; set; }
    public SupplierDocumentType Type { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public SupplierDocumentStatus Status { get; set; }
    public DateTime? AlertSentAtUtc { get; set; }
    public SupplierDocumentVerdict? Verdict { get; set; }
    public DateTime? VerdictIssuedAtUtc { get; set; }
    public List<SupplierDocumentReviewDto> Reviews { get; set; } = [];
}
