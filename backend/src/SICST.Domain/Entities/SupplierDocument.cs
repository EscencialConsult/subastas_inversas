namespace SICST.Domain.Entities;

public enum SupplierDocumentType
{
    CuitCertificate,
    TaxCertificate,
    LegalDocument,
    Other
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
}
