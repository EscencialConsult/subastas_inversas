using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class CompanyConfigurationEntityConfiguration : IEntityTypeConfiguration<SICST.Domain.Entities.CompanyConfiguration>
{
    public void Configure(EntityTypeBuilder<SICST.Domain.Entities.CompanyConfiguration> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.CompanyId).IsUnique();
            entity.Property(e => e.DefaultCurrency).IsRequired().HasMaxLength(3);
            entity.Property(e => e.TimeZone).IsRequired().HasMaxLength(100);
            entity.Property(e => e.MinimumBidDecrementPercentage).HasPrecision(5, 2);
            entity.Property(e => e.AuctionExtensionMinutes).IsRequired();
            entity.Property(e => e.RequireSupplierVerification).IsRequired();
            entity.Property(e => e.UpdatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
