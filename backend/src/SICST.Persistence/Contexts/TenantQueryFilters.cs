using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Persistence.Contexts;

internal static class TenantQueryFilters
{
    public static void ApplyTenantQueryFilters(this ModelBuilder modelBuilder, ICurrentTenant currentTenant)
    {
        modelBuilder.Entity<User>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<CompanySupplier>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<ContractingMode>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<ApprovalWorkflow>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<DocumentTemplate>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<CompanyConfiguration>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<PurchaseProcess>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<Auction>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<AuditEvent>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<Contract>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<ContractPayment>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<PurchaseOrder>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
        modelBuilder.Entity<AccessLog>().HasQueryFilter(e => currentTenant.CompanyId == null || e.CompanyId == currentTenant.CompanyId);
    }
}
