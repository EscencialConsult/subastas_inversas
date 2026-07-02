using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;

namespace SICST.Tests;

public static class TestDbContextFactory
{
    public static ApplicationDbContext Create(ICurrentTenant currentTenant, string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? Guid.NewGuid().ToString())
            .AddInterceptors(
                new TenantSaveChangesInterceptor(currentTenant),
                new ImmutabilitySaveChangesInterceptor(),
                new AuditSaveChangesInterceptor())
            .Options;

        var context = new ApplicationDbContext(options, currentTenant);
        context.Database.EnsureCreated();
        return context;
    }
}
