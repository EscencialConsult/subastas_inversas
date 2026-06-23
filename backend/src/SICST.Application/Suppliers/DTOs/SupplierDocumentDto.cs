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
}
