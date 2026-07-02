using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;

namespace SICST.Tests.Persistence.Interceptors;

public class AuditSaveChangesInterceptorTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestCurrentTenant _currentTenant;

    public AuditSaveChangesInterceptorTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _currentTenant = new TestCurrentTenant();
    }

    private ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new AuditSaveChangesInterceptor())
            .Options;

        var context = new ApplicationDbContext(options, _currentTenant);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task SavingChangesAsync_ShouldCreateAuditEvent_WithChainedHash()
    {
        // Arrange
        using var context = CreateContext();

        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Original Name"
        };

        // Act - Insert
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        // Assert - AuditEvent created for creation
        var audits = await context.AuditEvents.OrderBy(a => a.Sequence).ToListAsync();
        Assert.Single(audits);
        var firstAudit = audits[0];
        Assert.Equal(1, firstAudit.Sequence);
        Assert.Equal("Company", firstAudit.EntityName);
        Assert.Equal(company.Id.ToString(), firstAudit.EntityId);
        Assert.Equal(AuditEventAction.Created, firstAudit.Action);
        Assert.NotEmpty(firstAudit.Hash);

        // Act - Update
        company.Name = "Updated Name";
        await context.SaveChangesAsync();

        // Assert - Second AuditEvent created with chain
        audits = await context.AuditEvents.OrderBy(a => a.Sequence).ToListAsync();
        Assert.Equal(2, audits.Count);
        var secondAudit = audits[1];
        Assert.Equal(2, secondAudit.Sequence);
        Assert.Equal(firstAudit.Hash, secondAudit.PreviousHash);
        Assert.Equal(AuditEventAction.Updated, secondAudit.Action);
        Assert.Contains("Original Name", secondAudit.Payload);
        Assert.Contains("Updated Name", secondAudit.Payload);
    }

    [Fact]
    public async Task SavingChangesAsync_ShouldExcludeSensitiveProperties()
    {
        // Arrange
        using var context = CreateContext();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@sicst.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "SECRET_HASH",
            Role = UserRole.Admin,
            Active = true
        };

        // Act
        context.Users.Add(user);
        await context.SaveChangesAsync();

        // Assert
        var audit = await context.AuditEvents.FirstOrDefaultAsync(a => a.EntityId == user.Id.ToString());
        Assert.NotNull(audit);
        Assert.DoesNotContain("SECRET_HASH", audit.Payload);
        Assert.DoesNotContain("PasswordHash", audit.Payload);
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }
}
