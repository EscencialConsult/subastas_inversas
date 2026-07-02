using SICST.Domain.Entities;

namespace SICST.Application.Modules.Audit.DTOs;

public class AuditEventDto
{
    public Guid Id { get; set; }
    public long Sequence { get; set; }
    public Guid? CompanyId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public AuditEventAction Action { get; set; }
    public string Payload { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public string PreviousHash { get; set; } = string.Empty;
    public string Hash { get; set; } = string.Empty;
}
