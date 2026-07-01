namespace SICST.Application.Audit.DTOs;

public class RiskDashboardDto
{
    public DateTime GeneratedAtUtc { get; set; }
    public int TotalProcesses { get; set; }
    public int TotalAuctions { get; set; }
    public int TotalAlerts { get; set; }
    public int HighRiskAlerts { get; set; }
    public int MediumRiskAlerts { get; set; }
    public int InfoRiskAlerts { get; set; }
    public int ProcessesWithAlerts { get; set; }
    public bool IntegrityIsValid { get; set; }
    public int IntegrityFindings { get; set; }
    public List<RiskDashboardProcessDto> TopRiskProcesses { get; set; } = [];
}

public class RiskDashboardProcessDto
{
    public Guid PurchaseProcessId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public int AlertsCount { get; set; }
    public int HighRiskAlerts { get; set; }
    public int MediumRiskAlerts { get; set; }
    public int InfoRiskAlerts { get; set; }
}
