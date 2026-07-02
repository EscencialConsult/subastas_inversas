using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class SupplierCriterionResultConfiguration : IEntityTypeConfiguration<SupplierCriterionResult>
{
    public void Configure(EntityTypeBuilder<SupplierCriterionResult> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.SupplierEvaluationId, e.EvaluationCriterionId }).IsUnique();
            entity.Property(e => e.Score).HasPrecision(5, 2);
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.SupplierEvaluation)
                .WithMany(e => e.CriterionResults)
                .HasForeignKey(e => e.SupplierEvaluationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.EvaluationCriterion)
                .WithMany()
                .HasForeignKey(e => e.EvaluationCriterionId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
