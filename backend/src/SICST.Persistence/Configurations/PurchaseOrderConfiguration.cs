using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ContractId).IsUnique();
            entity.HasIndex(e => e.PurchaseProcessId);
            entity.HasIndex(e => new { e.CompanyId, e.Number }).IsUnique();
            entity.Property(e => e.Number).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.IssuedAtUtc).IsRequired();
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.PurchaseOrders)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Contract)
                .WithOne(c => c.PurchaseOrder)
                .HasForeignKey<PurchaseOrder>(e => e.ContractId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
