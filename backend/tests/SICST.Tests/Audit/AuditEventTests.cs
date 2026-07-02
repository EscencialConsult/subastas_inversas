using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using SICST.Domain.Entities;
using SICST.Persistence.Migrations;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Audit;

public class AuditEventTests
{
    private static ApplicationDbContext CreateDbContext()
    {
        return CreateDbContext(new SICST.Tests.TestCurrentTenant());
    }

    private static ApplicationDbContext CreateDbContext(SICST.Tests.TestCurrentTenant currentTenant)
    {
        return TestDbContextFactory.Create(currentTenant);
    }

    [Fact]
    public async Task SaveChanges_ShouldCreateChainedAuditEvents()
    {
        using var context = CreateDbContext();

        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Municipio Audit",
            Domain = $"audit-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        context.Companies.Add(company);
        await context.SaveChangesAsync();

        company.Name = "Municipio Audit Actualizado";
        await context.SaveChangesAsync();

        var events = await context.AuditEvents
            .OrderBy(e => e.Sequence)
            .ToListAsync();

        Assert.Equal(2, events.Count);
        Assert.Equal(AuditEventAction.Created, events[0].Action);
        Assert.Equal(AuditEventAction.Updated, events[1].Action);
        Assert.Equal(string.Empty, events[0].PreviousHash);
        Assert.Equal(events[0].Hash, events[1].PreviousHash);
        Assert.All(events, auditEvent => Assert.Equal(64, auditEvent.Hash.Length));
    }

    [Fact]
    public async Task SaveChanges_ShouldChainAuditEventsAcrossTenants()
    {
        var currentTenant = new SICST.Tests.TestCurrentTenant();
        using var context = CreateDbContext(currentTenant);

        var companyOneId = Guid.NewGuid();
        var companyTwoId = Guid.NewGuid();

        currentTenant.CompanyId = companyOneId;
        context.ContractingModes.Add(new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = companyOneId,
            Name = "Compra directa",
            Active = true,
            CreatedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        currentTenant.CompanyId = companyTwoId;
        context.ContractingModes.Add(new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = companyTwoId,
            Name = "Subasta inversa",
            Active = true,
            CreatedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var events = await context.AuditEvents
            .IgnoreQueryFilters()
            .OrderBy(e => e.Sequence)
            .ToListAsync();

        Assert.Equal(2, events.Count);
        Assert.Equal(companyOneId, events[0].CompanyId);
        Assert.Equal(companyTwoId, events[1].CompanyId);
        Assert.Equal(events[0].Hash, events[1].PreviousHash);
    }

    [Fact]
    public async Task SaveChanges_ShouldRejectAuditEventUpdatesAndDeletes()
    {
        using var context = CreateDbContext();

        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Municipio Append Only",
            Domain = $"append-only-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var auditEvent = await context.AuditEvents.SingleAsync();
        auditEvent.Payload = "{}";

        var updateError = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            context.SaveChangesAsync());
        Assert.Contains("append-only", updateError.Message);

        context.Entry(auditEvent).State = EntityState.Unchanged;
        context.AuditEvents.Remove(auditEvent);

        var deleteError = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            context.SaveChangesAsync());
        Assert.Contains("append-only", deleteError.Message);
    }

    [Fact]
    public void AddAuditAppendOnlyTrigger_ShouldCreateAntiUpdateDeleteTrigger()
    {
        var migration = new AddAuditAppendOnlyTrigger();
        var migrationBuilder = new MigrationBuilder("Npgsql.EntityFrameworkCore.PostgreSQL");

        typeof(AddAuditAppendOnlyTrigger)
            .GetMethod("Up", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!
            .Invoke(migration, [migrationBuilder]);

        var sql = string.Join("\n", migrationBuilder.Operations.OfType<SqlOperation>().Select(o => o.Sql));

        Assert.Contains("CREATE OR REPLACE FUNCTION prevent_audit_events_update_delete", sql);
        Assert.Contains("BEFORE UPDATE OR DELETE ON \"AuditEvents\"", sql);
        Assert.Contains("CREATE TRIGGER trg_audit_events_append_only", sql);
    }
}
