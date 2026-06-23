namespace SICST.Application.Configuration.DTOs;

public class CompanyConfigurationDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string DefaultCurrency { get; set; } = string.Empty;
    public string TimeZone { get; set; } = string.Empty;
    public decimal MinimumBidDecrementPercentage { get; set; }
    public int AuctionExtensionMinutes { get; set; }
    public bool RequireSupplierVerification { get; set; }
}
