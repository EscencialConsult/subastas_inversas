using SICST.Domain.Entities;

namespace SICST.Application.Public.DTOs;

public class PublicAuctionDto
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
    public int BidCount { get; set; }
    public string EventsUrl { get; set; } = string.Empty;
}
