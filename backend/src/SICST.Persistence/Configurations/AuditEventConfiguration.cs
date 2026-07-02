using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Sequence).IsUnique();
            entity.HasIndex(e => e.CompanyId);
            entity.HasIndex(e => new { e.CompanyId, e.CreatedAtUtc });
            entity.HasIndex(e => new { e.CompanyId, e.Action, e.CreatedAtUtc });
            entity.HasIndex(e => new { e.EntityName, e.EntityId });
            entity.Property(e => e.EntityName).IsRequired().HasMaxLength(150);
            entity.Property(e => e.EntityId).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Action).IsRequired().HasConversion<string>();
            entity.Property(e => e.Payload).IsRequired().HasColumnType("jsonb");
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.PreviousHash).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Hash).IsRequired().HasMaxLength(64);
    }
}
