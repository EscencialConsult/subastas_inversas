using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SICST.Application.Common.Interfaces;

namespace SICST.Persistence.Interceptors;

public class TenantSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentTenant _currentTenant;

    public TenantSaveChangesInterceptor(ICurrentTenant currentTenant)
    {
        _currentTenant = currentTenant;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        UpdateCentrallyManagedTenantId(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        UpdateCentrallyManagedTenantId(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void UpdateCentrallyManagedTenantId(DbContext? context)
    {
        if (context == null) return;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                var companyIdProp = entry.Entity.GetType().GetProperty("CompanyId");
                if (companyIdProp != null && companyIdProp.CanWrite)
                {
                    var currentValue = companyIdProp.GetValue(entry.Entity) as Guid?;
                    if ((currentValue == null || currentValue == Guid.Empty) && _currentTenant.CompanyId.HasValue)
                    {
                        companyIdProp.SetValue(entry.Entity, _currentTenant.CompanyId.Value);
                    }
                }
            }
        }
    }
}
