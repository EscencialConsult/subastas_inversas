using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using SICST.Domain.Entities;

namespace SICST.Persistence.Interceptors;

public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private static readonly HashSet<string> SensitiveAuditProperties =
    [
        nameof(User.PasswordHash),
        nameof(User.MfaSecret),
        nameof(User.RefreshTokenHash),
        nameof(User.RefreshTokenExpiresAtUtc)
    ];

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        CreateAuditEvents(eventData.Context, async: false).GetAwaiter().GetResult();
        return base.SavingChanges(eventData, result);
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        await CreateAuditEvents(eventData.Context, async: true, cancellationToken);
        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private async Task CreateAuditEvents(DbContext? context, bool async, CancellationToken cancellationToken = default)
    {
        if (context == null) return;

        var auditEntries = context.ChangeTracker.Entries()
            .Where(entry =>
                entry.Entity is not AuditEvent &&
                entry.Entity is not AccessLog &&
                entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted &&
                HasAuditableChanges(entry))
            .Select(CreatePendingAuditEvent)
            .ToList();

        if (auditEntries.Count > 0)
        {
            var auditDbSet = context.Set<AuditEvent>();
            
            AuditEvent? lastAudit = null;
            if (async)
            {
                lastAudit = await auditDbSet
                    .IgnoreQueryFilters()
                    .OrderByDescending(e => e.Sequence)
                    .FirstOrDefaultAsync(cancellationToken);
            }
            else
            {
                lastAudit = auditDbSet
                    .IgnoreQueryFilters()
                    .OrderByDescending(e => e.Sequence)
                    .FirstOrDefault();
            }

            var sequence = lastAudit?.Sequence ?? 0;
            var previousHash = lastAudit?.Hash ?? string.Empty;
            var now = DateTime.UtcNow;

            foreach (var auditEntry in auditEntries)
            {
                sequence++;
                auditEntry.Id = Guid.NewGuid();
                auditEntry.Sequence = sequence;
                auditEntry.CreatedAtUtc = now;
                auditEntry.PreviousHash = previousHash;
                auditEntry.Hash = ComputeHash(auditEntry);
                previousHash = auditEntry.Hash;
                auditDbSet.Add(auditEntry);
            }
        }
    }

    private static AuditEvent CreatePendingAuditEvent(EntityEntry entry)
    {
        return new AuditEvent
        {
            CompanyId = TryGetGuid(entry, "CompanyId"),
            EntityName = entry.Metadata.ClrType.Name,
            EntityId = ResolveEntityId(entry),
            Action = entry.State switch
            {
                EntityState.Added => AuditEventAction.Created,
                EntityState.Modified => AuditEventAction.Updated,
                EntityState.Deleted => AuditEventAction.Deleted,
                _ => AuditEventAction.Updated
            },
            Payload = BuildPayload(entry)
        };
    }

    private static bool HasAuditableChanges(EntityEntry entry)
    {
        if (entry.State != EntityState.Modified)
        {
            return true;
        }

        return entry.Properties.Any(p => p.IsModified && !SensitiveAuditProperties.Contains(p.Metadata.Name));
    }

    private static string ResolveEntityId(EntityEntry entry)
    {
        var id = TryGetValue(entry, "Id");
        return id?.ToString() ?? string.Empty;
    }

    private static Guid? TryGetGuid(EntityEntry entry, string propertyName)
    {
        var value = TryGetValue(entry, propertyName);
        return value is Guid guid ? guid : null;
    }

    private static object? TryGetValue(EntityEntry entry, string propertyName)
    {
        var property = entry.Properties.FirstOrDefault(p => p.Metadata.Name == propertyName);
        if (property == null)
        {
            return null;
        }

        return entry.State == EntityState.Deleted ? property.OriginalValue : property.CurrentValue;
    }

    private static string BuildPayload(EntityEntry entry)
    {
        var values = new SortedDictionary<string, object?>();

        foreach (var property in entry.Properties.OrderBy(p => p.Metadata.Name))
        {
            if (SensitiveAuditProperties.Contains(property.Metadata.Name))
            {
                continue;
            }

            if (entry.State == EntityState.Modified && !property.IsModified)
            {
                continue;
            }

            values[property.Metadata.Name] = entry.State switch
            {
                EntityState.Deleted => property.OriginalValue,
                EntityState.Modified => new
                {
                    before = property.OriginalValue,
                    after = property.CurrentValue
                },
                _ => property.CurrentValue
            };
        }

        return JsonSerializer.Serialize(values);
    }

    private static string ComputeHash(AuditEvent auditEvent)
    {
        var material = string.Join("|",
            auditEvent.Sequence,
            auditEvent.PreviousHash,
            auditEvent.CompanyId?.ToString() ?? string.Empty,
            auditEvent.EntityName,
            auditEvent.EntityId,
            auditEvent.Action,
            auditEvent.CreatedAtUtc.ToString("O"),
            auditEvent.Payload);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
