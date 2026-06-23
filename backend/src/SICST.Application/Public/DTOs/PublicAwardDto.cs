namespace SICST.Application.Public.DTOs;

public class PublicAwardDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime AdjudicatedAtUtc { get; set; }
    public string Observations { get; set; } = string.Empty;
    public string ActUrl { get; set; } = string.Empty;
}
