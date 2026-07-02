using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ApprovalConfiguration : IEntityTypeConfiguration<Approval>
{
    public void Configure(EntityTypeBuilder<Approval> entity)
    {

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Comments).HasMaxLength(2000);
            entity.Property(e => e.Status).IsRequired().HasConversion<string>();
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.PurchaseProcess)
                .WithMany()
                .HasForeignKey(e => e.PurchaseProcessId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Approver)
                .WithMany()
                .HasForeignKey(e => e.ApproverId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ApprovalWorkflowLevel)
                .WithMany()
                .HasForeignKey(e => e.ApprovalWorkflowLevelId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
