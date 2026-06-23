namespace SICST.Application.Auctions.DTOs;

public class BidDto
{
    public Guid Id { get; set; }
    public Guid AuctionId { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime PlacedAtUtc { get; set; }
}
