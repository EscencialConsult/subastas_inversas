using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;

namespace SICST.Tests.Persistence.Interceptors;

public class TenantSaveChangesInterceptorTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestCurrentTenant _currentTenant;

    public TenantSaveChangesInterceptorTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _currentTenant = new TestCurrentTenant();
    }

    private ApplicationDbContext CreateContext(TenantSaveChangesInterceptor interceptor)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(interceptor)
            .Options;

        var context = new ApplicationDbContext(options, _currentTenant);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task SavingChangesAsync_ShouldAssignTenantId_WhenCompanyIdIsEmpty()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        _currentTenant.CompanyId = tenantId;
        
        var interceptor = new TenantSaveChangesInterceptor(_currentTenant);
        using var context = CreateContext(interceptor);

        // Seed Company first due to FK constraints
        var company = new Company { Id = tenantId, Name = "Test Company" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var template = new DocumentTemplate
        {
            Id = Guid.NewGuid(),
            Name = "Template Test",
            Content = "Content",
            Type = DocumentTemplateType.Contract,
            Version = 1,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Act
        context.DocumentTemplates.Add(template);
        await context.SaveChangesAsync();

        // Assert
        Assert.Equal(tenantId, template.CompanyId);
    }

    [Fact]
    public async Task SavingChangesAsync_ShouldNotOverwrite_WhenCompanyIdIsAlreadyAssigned()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var customCompanyId = Guid.NewGuid();
        _currentTenant.CompanyId = tenantId;
        
        var interceptor = new TenantSaveChangesInterceptor(_currentTenant);
        using var context = CreateContext(interceptor);

        // Seed both companies first due to FK constraints
        context.Companies.Add(new Company { Id = tenantId, Name = "Test Company", Domain = "test1.com" });
        context.Companies.Add(new Company { Id = customCompanyId, Name = "Custom Company", Domain = "test2.com" });
        await context.SaveChangesAsync();

        var template = new DocumentTemplate
        {
            Id = Guid.NewGuid(),
            CompanyId = customCompanyId,
            Name = "Template Test",
            Content = "Content",
            Type = DocumentTemplateType.Contract,
            Version = 1,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Act
        context.DocumentTemplates.Add(template);
        await context.SaveChangesAsync();

        // Assert
        Assert.Equal(customCompanyId, template.CompanyId);
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }
}
