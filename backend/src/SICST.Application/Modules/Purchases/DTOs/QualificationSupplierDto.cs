using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.DTOs;

public class QualificationSupplierDto
{
    public Guid InvitationId { get; set; }
    public Guid SupplierId { get; set; }
    public string BusinessName { get; set; } = string.Empty;
    public string Cuit { get; set; } = string.Empty;
    public QualificationStatus? QualificationStatus { get; set; }
    public string? QualificationNotes { get; set; }
    public Guid? QualifiedById { get; set; }
    public string? QualifiedByName { get; set; }
    public DateTime? QualifiedAtUtc { get; set; }
}
