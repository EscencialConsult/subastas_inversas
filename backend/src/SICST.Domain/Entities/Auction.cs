namespace SICST.Domain.Entities;

public enum AuctionStatus
{
    Open,
    Closed,
    Scheduled
}

public class Auction
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }

    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public decimal BasePrice { get; set; }

    public decimal MinimumDecrementPercentage { get; set; }

    public AuctionStatus Status { get; set; } = AuctionStatus.Open;

    public DateTime StartsAtUtc { get; set; }

    public DateTime EndsAtUtc { get; set; }

    public int AutoExtensionMinutes { get; set; } = 3;

    public decimal PabThreshold { get; set; }

    public DateTime? ClosedAtUtc { get; set; }

    public List<AuctionParticipant> Participants { get; set; } = [];

    public List<Bid> Bids { get; set; } = [];
}
