using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class CompanySupplierConfiguration : IEntityTypeConfiguration<CompanySupplier>
{
    public void Configure(EntityTypeBuilder<CompanySupplier> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.SupplierId }).IsUnique();
            entity.Property(e => e.LinkedAtUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.WarningMessage).HasMaxLength(500);
            entity.Property(e => e.EvaluatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
