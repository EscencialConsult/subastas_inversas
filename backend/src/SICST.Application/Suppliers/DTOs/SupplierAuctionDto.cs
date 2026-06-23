using SICST.Application.Auctions.DTOs;

namespace SICST.Application.Suppliers.DTOs;

public class SupplierAuctionDto
{
    public Guid AuctionId { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid CompanyId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal MinimumDecrementPercentage { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public List<Guid> ParticipantSupplierIds { get; set; } = [];
    public List<BidDto> Bids { get; set; } = [];
}
