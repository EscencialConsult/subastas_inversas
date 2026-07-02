using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class EvaluationCriterionConfiguration : IEntityTypeConfiguration<EvaluationCriterion>
{
    public void Configure(EntityTypeBuilder<EvaluationCriterion> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.PurchaseProcessId, e.Name }).IsUnique();
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Weight).HasPrecision(5, 2);
            entity.Property(e => e.SortOrder).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany(p => p.EvaluationCriteria)
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedBy)
                .WithMany()
                .HasForeignKey(e => e.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
