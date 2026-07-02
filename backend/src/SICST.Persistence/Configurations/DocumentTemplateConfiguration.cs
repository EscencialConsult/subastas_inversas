using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class DocumentTemplateConfiguration : IEntityTypeConfiguration<DocumentTemplate>
{
    public void Configure(EntityTypeBuilder<DocumentTemplate> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.Type, e.Version }).IsUnique();
            entity.HasIndex(e => new { e.CompanyId, e.Type, e.Active });
            entity.Property(e => e.Type).IsRequired().HasConversion<string>();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Version).IsRequired();
            entity.Property(e => e.Content).IsRequired().HasMaxLength(12000);
            entity.Property(e => e.Active).IsRequired().HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
