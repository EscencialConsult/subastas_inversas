using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AwardItemConfiguration : IEntityTypeConfiguration<AwardItem>
{
    public void Configure(EntityTypeBuilder<AwardItem> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.AwardId, e.PurchaseItemId }).IsUnique();
            entity.Property(e => e.Quantity).HasPrecision(18, 2);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 2);
            entity.Property(e => e.TotalAmount).HasPrecision(18, 2);

            entity.HasOne(e => e.Award)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.AwardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseItem)
                .WithMany()
                .HasForeignKey(e => e.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
