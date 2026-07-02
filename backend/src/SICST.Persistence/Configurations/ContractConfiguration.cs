using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AwardId).IsUnique();
            entity.HasIndex(e => e.PurchaseProcessId);
            entity.HasIndex(e => new { e.CompanyId, e.Number }).IsUnique();
            entity.Property(e => e.Number).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.StartDateUtc).IsRequired();
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.Terms).HasMaxLength(4000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.Contracts)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Award)
                .WithOne(a => a.Contract)
                .HasForeignKey<Contract>(e => e.AwardId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.SignedByOperator)
                .WithMany()
                .HasForeignKey(e => e.SignedByOperatorId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.Property(e => e.SignatureHash).HasMaxLength(64);
    }
}
