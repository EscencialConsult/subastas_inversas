using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ArcaVerificationAuditConfiguration : IEntityTypeConfiguration<ArcaVerificationAudit>
{
    public void Configure(EntityTypeBuilder<ArcaVerificationAudit> entity)
    {
        entity.ToTable("ArcaVerificationAudits");
        entity.HasKey(e => e.Id);
        entity.Property(e => e.Notes).HasMaxLength(2000);
        entity.Property(e => e.Source).IsRequired().HasMaxLength(100);
        entity.Property(e => e.CuitConsulted).HasMaxLength(13);
        entity.Property(e => e.BusinessNameDeclared).HasMaxLength(500);
        entity.Property(e => e.BusinessNameFoundInArca).HasMaxLength(500);
        entity.Property(e => e.RawResponseSummary).HasMaxLength(2000);
        entity.HasIndex(e => e.SupplierId);
        entity.HasIndex(e => e.CreatedAtUtc);

        entity.HasOne(e => e.Supplier)
            .WithMany()
            .HasForeignKey(e => e.SupplierId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(e => e.ReviewedBy)
            .WithMany()
            .HasForeignKey(e => e.ReviewedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
