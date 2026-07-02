using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AuctionConfiguration : IEntityTypeConfiguration<Auction>
{
    public void Configure(EntityTypeBuilder<Auction> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PurchaseProcessId).IsUnique();
            entity.HasIndex(e => new { e.CompanyId, e.Status, e.EndsAtUtc });
            entity.HasIndex(e => new { e.CompanyId, e.ClosedAtUtc });
            entity.Property(e => e.BasePrice).HasPrecision(18, 2);
            entity.Property(e => e.MinimumDecrementPercentage).HasPrecision(5, 2);
            entity.Property(e => e.Status).IsRequired();
            entity.Property(e => e.StartsAtUtc).IsRequired();
            entity.Property(e => e.EndsAtUtc).IsRequired();
            entity.Property(e => e.AutoExtensionMinutes).IsRequired().HasDefaultValue(3);
            entity.Property(e => e.PabThreshold).HasPrecision(18, 2);
            entity.Property(e => e.ClosingActHash).HasMaxLength(64);
            entity.Property(e => e.ClosingActPath).HasMaxLength(500);
            entity.Property(e => e.SavingsAmount).HasPrecision(18, 2);
            entity.Property(e => e.SavingsPercentage).HasPrecision(5, 2);

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
