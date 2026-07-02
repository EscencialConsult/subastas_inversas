using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;

namespace SICST.Tests.Persistence.Interceptors;

public class ImmutabilitySaveChangesInterceptorTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly TestCurrentTenant _currentTenant;

    public ImmutabilitySaveChangesInterceptorTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _currentTenant = new TestCurrentTenant();
    }

    private ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(new ImmutabilitySaveChangesInterceptor())
            .Options;

        var context = new ApplicationDbContext(options, _currentTenant);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task AuditEvent_ShouldAllowInsert_ButThrowOnModifyOrDelete()
    {
        // Arrange
        using var context = CreateContext();
        var audit = new AuditEvent
        {
            Id = Guid.NewGuid(),
            Sequence = 1,
            EntityName = "Test",
            EntityId = "1",
            Action = AuditEventAction.Created,
            Payload = "{}",
            Hash = "abc",
            CreatedAtUtc = DateTime.UtcNow
        };

        // Act & Assert (Insert is OK)
        context.AuditEvents.Add(audit);
        await context.SaveChangesAsync();

        // Act & Assert (Modify should throw)
        audit.Payload = "{ \"modified\": true }";
        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());

        // Reload to clean state
        context.Entry(audit).State = EntityState.Unchanged;

        // Act & Assert (Delete should throw)
        context.AuditEvents.Remove(audit);
        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task Award_WithImmutableHash_ShouldThrowOnModifyOrDelete()
    {
        // Arrange
        using var context = CreateContext();
        var company = new Company { Id = Guid.NewGuid(), Name = "Comp", Domain = "comp.com" };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "123",
            Role = UserRole.Admin,
            Active = true,
            CompanyId = company.Id
        };
        context.Users.Add(user);

        var supplierUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "supplier@test.com",
            FirstName = "Supplier",
            LastName = "User",
            PasswordHash = "123",
            Role = UserRole.Proveedor,
            Active = true,
            CompanyId = company.Id
        };
        context.Users.Add(supplierUser);

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = supplierUser.Id,
            BusinessName = "Supplier Ltd",
            Cuit = "123456789",
            Email = "supp@test.com",
            Status = SupplierStatus.Verified
        };
        context.Suppliers.Add(supplier);
        await context.SaveChangesAsync();

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            BuyerId = user.Id,
            Code = "PP-001",
            Title = "Title",
            Description = "Desc",
            Status = PurchaseProcessStatus.Draft,
            EstimatedBudget = 1000,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.PurchaseProcesses.Add(process);
        await context.SaveChangesAsync();

        var award = new Award
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplier.Id,
            AdjudicatedById = user.Id,
            ImmutableHash = "hash-value",
            AdjudicatedAtUtc = DateTime.UtcNow
        };

        context.Awards.Add(award);
        await context.SaveChangesAsync();

        // Modify
        award.ImmutableHash = "new-hash";
        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());

        // Reload
        context.Entry(award).State = EntityState.Unchanged;

        // Delete
        context.Awards.Remove(award);
        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }
}
