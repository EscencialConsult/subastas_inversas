namespace SICST.Application.Audit.DTOs;

public class RiskAlertDto
{
    public Guid CompanyId { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public Guid AuctionId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public decimal? MetricValue { get; set; }
    public string MetricUnit { get; set; } = string.Empty;
    public DateTime DetectedAtUtc { get; set; }
}
