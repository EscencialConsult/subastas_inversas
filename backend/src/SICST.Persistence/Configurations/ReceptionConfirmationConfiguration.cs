using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ReceptionConfirmationConfiguration : IEntityTypeConfiguration<ReceptionConfirmation>
{
    public void Configure(EntityTypeBuilder<ReceptionConfirmation> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseOrderId, e.ReceivedAtUtc });
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.ReceivedAtUtc).IsRequired();
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.PurchaseOrder)
                .WithMany(e => e.Receptions)
                .HasForeignKey(e => e.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReceivedBy)
                .WithMany()
                .HasForeignKey(e => e.ReceivedById)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
