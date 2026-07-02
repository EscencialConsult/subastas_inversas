namespace SICST.Domain.Entities;

public enum OutboxMessageStatus
{
    Pending = 0,
    Processing = 1,
    Processed = 2,
    Failed = 3
}

public class OutboxMessage
{
    public Guid Id { get; set; }

    public Guid? CompanyId { get; set; }

    public string EventType { get; set; } = string.Empty;

    public string Payload { get; set; } = string.Empty;

    public string IdempotencyKey { get; set; } = string.Empty;

    public OutboxMessageStatus Status { get; set; } = OutboxMessageStatus.Pending;

    public int Attempts { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? AvailableAtUtc { get; set; }

    public DateTime? LockedUntilUtc { get; set; }

    public string? LockId { get; set; }

    public DateTime? ProcessedAtUtc { get; set; }

    public string? LastError { get; set; }
}
