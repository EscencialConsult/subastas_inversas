using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ApprovalWorkflowLevelConfiguration : IEntityTypeConfiguration<ApprovalWorkflowLevel>
{
    public void Configure(EntityTypeBuilder<ApprovalWorkflowLevel> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ApprovalWorkflowId, e.LevelOrder }).IsUnique();
            entity.Property(e => e.LevelOrder).IsRequired();
            entity.Property(e => e.RequiredRole).IsRequired();
            entity.Property(e => e.AmountThreshold).HasPrecision(18, 2);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.ApprovalWorkflow)
                .WithMany(e => e.Levels)
                .HasForeignKey(e => e.ApprovalWorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
    }
}
