using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.PasswordHash).IsRequired();
            entity.Property(e => e.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.LastName).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.MfaEnabled).IsRequired().HasDefaultValue(false);
            entity.Property(e => e.MfaSecret).HasMaxLength(128);
            entity.Property(e => e.RefreshTokenHash).HasMaxLength(256);
            entity.Property(e => e.RefreshTokenExpiresAtUtc);
            entity.Property(e => e.RefreshTokenRevokedAtUtc);
            
            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
