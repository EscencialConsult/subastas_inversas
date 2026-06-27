namespace SICST.Domain.Entities;

public class Bid
{
    public Guid Id { get; set; }

    public Guid AuctionId { get; set; }

    public Auction Auction { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public decimal Amount { get; set; }

    public DateTime PlacedAtUtc { get; set; }

    public bool IsPab { get; set; }

    public int SequenceNumber { get; set; }

    public string PreviousHash { get; set; } = string.Empty;

    public string Hash { get; set; } = string.Empty;
}
