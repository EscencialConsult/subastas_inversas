namespace SICST.Application.Audit.DTOs;

public class IntegrityVerificationDto
{
    public bool IsValid { get; set; }
    public DateTime VerifiedAtUtc { get; set; }
    public int AuditEventsChecked { get; set; }
    public int BidChainsChecked { get; set; }
    public int BidsChecked { get; set; }
    public int SignaturesChecked { get; set; }
    public int DocumentsChecked { get; set; }
    public List<IntegrityFindingDto> Findings { get; set; } = [];
}

public class IntegrityFindingDto
{
    public string Scope { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Severity { get; set; } = "high";
    public string Message { get; set; } = string.Empty;
    public string ExpectedHash { get; set; } = string.Empty;
    public string ActualHash { get; set; } = string.Empty;
}
