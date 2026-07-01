using SICST.Domain.Entities;

namespace SICST.Application.Public.DTOs;

public class PublicPurchaseProcessDetailDto : PublicPurchaseProcessDto
{
    public DateTime? ClosedAtUtc { get; set; }
    public string SpecificationsHash { get; set; } = string.Empty;
    public List<PublicPurchaseItemDto> Items { get; set; } = [];
    public PublicAuctionDto? Auction { get; set; }
    public List<PublicAwardDto> Awards { get; set; } = [];
}

public class PublicPurchaseItemDto
{
    public Guid Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal? EstimatedUnitPrice { get; set; }
    public decimal? EstimatedTotal { get; set; }
}
