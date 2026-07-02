using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Cuit).IsUnique();
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.Cuit).IsRequired().HasMaxLength(13);
            entity.Property(e => e.BusinessName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.BusinessCategory).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Province).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Locality).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.BusinessCategory);
            entity.HasIndex(e => new { e.Province, e.Locality });
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.ArcaVerified).IsRequired();
            entity.Property(e => e.ArcaVerificationStatus).IsRequired();
            entity.Property(e => e.ArcaVerificationNotes).HasMaxLength(1000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<Supplier>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
