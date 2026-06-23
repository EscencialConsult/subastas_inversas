namespace SICST.Domain.Entities;

public class CompanyConfiguration
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public string DefaultCurrency { get; set; } = "ARS";

    public string TimeZone { get; set; } = "America/Argentina/Buenos_Aires";

    public decimal MinimumBidDecrementPercentage { get; set; } = 1;

    public int AuctionExtensionMinutes { get; set; } = 2;

    public bool RequireSupplierVerification { get; set; } = true;

    public DateTime UpdatedAtUtc { get; set; }
}
