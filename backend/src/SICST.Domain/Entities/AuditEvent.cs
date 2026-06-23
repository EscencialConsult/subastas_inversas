namespace SICST.Domain.Entities;

public enum AuditEventAction
{
    Created = 0,
    Updated = 1,
    Deleted = 2
}

public class AuditEvent
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
