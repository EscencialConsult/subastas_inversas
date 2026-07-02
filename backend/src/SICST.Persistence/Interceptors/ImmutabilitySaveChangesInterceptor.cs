using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SICST.Domain.Entities;

namespace SICST.Persistence.Interceptors;

public class ImmutabilitySaveChangesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        CheckImmutabilityConstraints(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        CheckImmutabilityConstraints(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void CheckImmutabilityConstraints(DbContext? context)
    {
        if (context == null) return;

        if (context.ChangeTracker.Entries<AuditEvent>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("El log de auditoria es append-only y no puede modificarse ni eliminarse.");
        }

        if (context.ChangeTracker.Entries<Award>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted &&
                !string.IsNullOrWhiteSpace(entry.Entity.ImmutableHash)))
        {
            throw new InvalidOperationException("Las adjudicaciones registradas son inmutables.");
        }

        if (context.ChangeTracker.Entries<AwardItem>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Los items de adjudicacion registrados son inmutables.");
        }

        if (context.ChangeTracker.Entries<SupplierDocumentReview>()
            .Any(entry => entry.State is EntityState.Modified or EntityState.Deleted))
        {
            throw new InvalidOperationException("Los dictamenes y revisiones documentales son inmutables.");
        }
    }
}
