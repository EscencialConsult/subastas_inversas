using SICST.Domain.Entities;

namespace SICST.Application.Auctions.DTOs;

public class AuctionDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid CompanyId { get; set; }
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal MinimumDecrementPercentage { get; set; }
    public AuctionStatus Status { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public int AutoExtensionMinutes { get; set; }
    public decimal PabThreshold { get; set; }
    public List<Guid> ParticipantSupplierIds { get; set; } = [];
    public List<BidDto> Bids { get; set; } = [];
}
