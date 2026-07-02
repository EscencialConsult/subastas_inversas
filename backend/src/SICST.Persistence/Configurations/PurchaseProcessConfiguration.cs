using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class PurchaseProcessConfiguration : IEntityTypeConfiguration<PurchaseProcess>
{
    public void Configure(EntityTypeBuilder<PurchaseProcess> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Code }).IsUnique();
            entity.HasIndex(e => new { e.CompanyId, e.Status, e.CreatedAtUtc });
            entity.HasIndex(e => new { e.CompanyId, e.Title });
            entity.Property(e => e.Code).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.EstimatedBudget).HasPrecision(18, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.SpecificationsHash).HasMaxLength(64);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Buyer)
                .WithMany()
                .HasForeignKey(e => e.BuyerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ContractingMode)
                .WithMany()
                .HasForeignKey(e => e.ContractingModeId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
