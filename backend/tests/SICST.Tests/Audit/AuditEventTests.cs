using Microsoft.EntityFrameworkCore;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Audit;

public class AuditEventTests
{
    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
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
}
