namespace SICST.Domain.Entities;

public enum SupplierDocumentType
{
    CuitCertificate,
    TaxCertificate,
    LegalDocument,
    Other
}

public enum SupplierDocumentStatus
{
    Valid,
    ExpiringSoon,
    Expired
}

public class SupplierDocument
{
    public Guid Id { get; set; }

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public SupplierDocumentType Type { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public string StoragePath { get; set; } = string.Empty;

    public DateTime UploadedAtUtc { get; set; }

    public string Sha256Hash { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public SupplierDocumentStatus Status { get; set; }

    public DateTime? AlertSentAtUtc { get; set; }

    public List<SupplierDocumentReview> Reviews { get; set; } = [];
}
