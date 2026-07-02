using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AuctionParticipantConfiguration : IEntityTypeConfiguration<AuctionParticipant>
{
    public void Configure(EntityTypeBuilder<AuctionParticipant> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AuctionId, e.SupplierId }).IsUnique();
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.JoinedAtUtc).IsRequired();

            entity.HasOne(e => e.Auction)
                .WithMany(e => e.Participants)
                .HasForeignKey(e => e.AuctionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
