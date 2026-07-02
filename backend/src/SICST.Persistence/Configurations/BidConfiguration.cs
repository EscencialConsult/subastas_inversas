using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class BidConfiguration : IEntityTypeConfiguration<Bid>
{
    public void Configure(EntityTypeBuilder<Bid> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AuctionId, e.Amount });
            entity.HasIndex(e => new { e.AuctionId, e.PlacedAtUtc });
            entity.HasIndex(e => new { e.AuctionId, e.PlacedAtUtc });
            entity.HasIndex(e => new { e.AuctionId, e.SequenceNumber }).IsUnique();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.PlacedAtUtc).IsRequired();
            entity.Property(e => e.IsPab).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.SequenceNumber).IsRequired();
            entity.Property(e => e.PreviousHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Hash).IsRequired().HasMaxLength(64);

            entity.HasOne(e => e.Auction)
                .WithMany(e => e.Bids)
                .HasForeignKey(e => e.AuctionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
