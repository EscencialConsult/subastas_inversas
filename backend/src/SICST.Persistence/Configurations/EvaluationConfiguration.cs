using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class EvaluationConfiguration : IEntityTypeConfiguration<Evaluation>
{
    public void Configure(EntityTypeBuilder<Evaluation> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.PurchaseProcessId).IsUnique();
            entity.Property(e => e.RecommendedSupplier).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Observations).HasMaxLength(2000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithOne(p => p.Evaluation)
                .HasForeignKey<Evaluation>(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Evaluator)
                .WithMany()
                .HasForeignKey(e => e.EvaluatorId)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
