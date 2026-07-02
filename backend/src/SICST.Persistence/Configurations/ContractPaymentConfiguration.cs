using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SICST.Domain.Entities;

namespace SICST.Persistence.Configurations;

public class ContractPaymentConfiguration : IEntityTypeConfiguration<ContractPayment>
{
    public void Configure(EntityTypeBuilder<ContractPayment> entity)
    {

            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyId, e.ContractId, e.PaymentDateUtc });
            entity.Property(e => e.PaymentAmount).HasPrecision(18, 2);
            entity.Property(e => e.PenaltyAmount).HasPrecision(18, 2);
            entity.Property(e => e.DelayDays).IsRequired();
            entity.Property(e => e.PaymentDateUtc).IsRequired();
            entity.Property(e => e.CreatedAtUtc).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(2000);

            entity.HasOne(e => e.Company)
                .WithMany()
                .HasForeignKey(e => e.CompanyId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Contract)
                .WithMany(e => e.Payments)
                .HasForeignKey(e => e.ContractId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.RegisteredBy)
                .WithMany()
                .HasForeignKey(e => e.RegisteredById)
                .OnDelete(DeleteBehavior.Restrict);
    }
}
