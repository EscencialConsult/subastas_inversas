using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AccessLogConfiguration : IEntityTypeConfiguration<AccessLog>
{
    public void Configure(EntityTypeBuilder<AccessLog> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => e.OccurredAtUtc);
            entity.HasIndex(e => new { e.CompanyId, e.Success, e.OccurredAtUtc });
            entity.HasIndex(e => new { e.Email, e.OccurredAtUtc });
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.EventType).IsRequired().HasConversion<string>();
            entity.Property(e => e.Success).IsRequired();
            entity.Property(e => e.FailureReason).HasMaxLength(300);
            entity.Property(e => e.IpAddress).HasMaxLength(80);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.Property(e => e.OccurredAtUtc).IsRequired();
    }
}
