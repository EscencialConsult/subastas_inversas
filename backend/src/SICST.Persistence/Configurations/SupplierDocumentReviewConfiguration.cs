using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class SupplierDocumentReviewConfiguration : IEntityTypeConfiguration<SupplierDocumentReview>
{
    public void Configure(EntityTypeBuilder<SupplierDocumentReview> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SupplierDocumentId);
            entity.HasIndex(e => new { e.SupplierDocumentId, e.Action });
            entity.Property(e => e.Action).IsRequired().HasConversion<string>();
            entity.Property(e => e.Verdict).HasConversion<string>();
            entity.Property(e => e.Notes).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.ExceptionReason).HasMaxLength(2000);
            entity.Property(e => e.CreatedAtUtc).IsRequired();

            entity.HasOne(e => e.SupplierDocument)
                .WithMany(e => e.Reviews)
                .HasForeignKey(e => e.SupplierDocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Reviewer)
                .WithMany()
                .HasForeignKey(e => e.ReviewerId)
                .OnDelete(DeleteBehavior.SetNull);
    }
}
