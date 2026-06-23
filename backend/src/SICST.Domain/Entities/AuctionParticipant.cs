namespace SICST.Domain.Entities;

public class AuctionParticipant
{
    public Guid Id { get; set; }

    public Guid AuctionId { get; set; }

    public Auction Auction { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public bool Active { get; set; } = true;

    public DateTime JoinedAtUtc { get; set; }
}
