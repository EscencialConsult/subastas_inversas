namespace SICST.Application.Auctions.DTOs;

public class AuctionComparisonRowDto
{
    public int Position { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal BestAmount { get; set; }
    public int BidCount { get; set; }
    public DateTime LastBidAtUtc { get; set; }
    public decimal SavingsAmount { get; set; }
    public decimal SavingsPercentage { get; set; }
}
