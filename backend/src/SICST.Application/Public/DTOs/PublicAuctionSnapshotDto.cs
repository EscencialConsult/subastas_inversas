using SICST.Domain.Entities;

namespace SICST.Application.Public.DTOs;

public class PublicAuctionSnapshotDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string ProcessCode { get; set; } = string.Empty;
    public string ProcessTitle { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal CurrentPrice { get; set; }
    public AuctionStatus Status { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime EndsAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public int BidCount { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public bool IdentitiesRevealed { get; set; }
    public List<PublicAuctionRankingItemDto> Ranking { get; set; } = [];
}

public class PublicAuctionRankingItemDto
{
    public int Position { get; set; }
    public Guid SupplierId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int BidCount { get; set; }
    public DateTime LastBidAtUtc { get; set; }
}
