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

    // Si tiene valor, el documento está "archivado": el proveedor lo quitó de su vista y deja
    // de contar para su estado, pero el registro (y sus dictámenes inmutables) se conservan
    // para auditoría. Un filtro global de EF lo excluye de todas las consultas normales.
    public DateTime? ArchivedAtUtc { get; set; }

    public List<SupplierDocumentReview> Reviews { get; set; } = [];
}
