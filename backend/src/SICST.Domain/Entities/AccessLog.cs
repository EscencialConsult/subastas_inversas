namespace SICST.Domain.Entities;

public enum AccessLogEventType
{
    LoginSucceeded = 0,
    LoginFailed = 1,
    MfaRequired = 2,
    MfaSucceeded = 3,
    MfaFailed = 4,
    RefreshSucceeded = 5,
    RefreshFailed = 6,
    Logout = 7
}

public class AccessLog
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public Guid? CompanyId { get; set; }

    public string Email { get; set; } = string.Empty;

    public AccessLogEventType EventType { get; set; }

    public bool Success { get; set; }

    public string? FailureReason { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public DateTime OccurredAtUtc { get; set; }
}
