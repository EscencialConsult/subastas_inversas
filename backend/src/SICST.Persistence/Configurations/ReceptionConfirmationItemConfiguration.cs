using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ReceptionConfirmationItemConfiguration : IEntityTypeConfiguration<ReceptionConfirmationItem>
{
    public void Configure(EntityTypeBuilder<ReceptionConfirmationItem> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ReceptionConfirmationId, e.PurchaseItemId }).IsUnique();
            entity.Property(e => e.QuantityReceived).HasPrecision(18, 2);

            entity.HasOne(e => e.ReceptionConfirmation)
                .WithMany(e => e.Items)
                .HasForeignKey(e => e.ReceptionConfirmationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseItem)
                .WithMany()
                .HasForeignKey(e => e.PurchaseItemId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
