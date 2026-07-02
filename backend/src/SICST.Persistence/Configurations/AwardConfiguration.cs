using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AwardConfiguration : IEntityTypeConfiguration<Award>
{
    public void Configure(EntityTypeBuilder<Award> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.SupplierId }).IsUnique();
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.DocumentPath).IsRequired().HasMaxLength(500);
            entity.Property(e => e.DocumentHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.ImmutableHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.AdjudicatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.Awards)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Supplier)
                .WithMany()
                .HasForeignKey(e => e.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AdjudicatedBy)
                .WithMany()
                .HasForeignKey(e => e.AdjudicatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DocumentTemplate)
                .WithMany()
                .HasForeignKey(e => e.DocumentTemplateId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
