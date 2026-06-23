using Microsoft.EntityFrameworkCore;
using SICST.Application.Suppliers.Commands;
using SICST.Application.Suppliers.Queries;
using SICST.Domain.Entities;
using SICST.Infrastructure.Security;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Suppliers;

public class SupplierHandlerTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task RegisterSupplier_ShouldCreateUserAndSupplierProfile()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Insumos del Norte SRL",
            Cuit = "30-12345678-1",
            Email = "ventas@insumosnorte.com",
            Password = "Proveedor123!",
            Province = "Tucuman",
            Locality = "San Miguel de Tucuman"
        };

        var result = await handler.Handle(command, CancellationToken.None);

        var user = await context.Users.FindAsync(result.UserId);
        var supplier = await context.Suppliers.FindAsync(result.SupplierId);

        Assert.NotNull(user);
        Assert.NotNull(supplier);
        Assert.Equal(UserRole.Proveedor, user.Role);
        Assert.True(user.Active);
        Assert.Null(user.CompanyId);
        Assert.Equal(user.Id, supplier.UserId);
        Assert.Equal("30-12345678-1", supplier.Cuit);
        Assert.Equal(SupplierStatus.Verified, supplier.Status);
    }

    [Fact]
    public async Task RegisterSupplier_ShouldThrow_WhenCuitAlreadyExists()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Proveedor Uno",
            Cuit = "30-12345678-1",
            Email = "uno@proveedor.com",
            Password = "Proveedor123!",
            Province = "Tucuman",
            Locality = "Tafi Viejo"
        };

        await handler.Handle(command, CancellationToken.None);

        var duplicate = command with
        {
            BusinessName = "Proveedor Dos",
            Email = "dos@proveedor.com"
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(duplicate, CancellationToken.None));
    }

    [Fact]
    public async Task GetSupplierByUserId_ShouldReturnSupplier()
    {
        using var context = CreateDbContext();
        var userId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();

        context.Users.Add(new User
        {
            Id = userId,
            Email = "proveedor@test.com",
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "",
            Role = UserRole.Proveedor,
            Active = true
        });

        context.Suppliers.Add(new Supplier
        {
            Id = supplierId,
            UserId = userId,
            BusinessName = "Proveedor Test",
            Cuit = "30-99999999-1",
            Email = "proveedor@test.com",
            Province = "Buenos Aires",
            Locality = "La Plata",
            Status = SupplierStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var handler = new GetSupplierByUserIdQueryHandler(context);
        var result = await handler.Handle(new GetSupplierByUserIdQuery(userId), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(supplierId, result.Id);
        Assert.Equal("Proveedor Test", result.BusinessName);
        Assert.Equal(SupplierStatus.Pending, result.Status);
    }

    [Fact]
    public async Task RegisterSupplier_ShouldThrow_WhenCuitHasInvalidCheckDigit()
    {
        using var context = CreateDbContext();
        var handler = new RegisterSupplierCommandHandler(context, new PasswordHasher());

        var command = new RegisterSupplierCommand
        {
            BusinessName = "Proveedor Invalido CUIT",
            Cuit = "30-12345678-0", // mathematically invalid check digit (should be 9)
            Email = "invalido@proveedor.com",
            Password = "Proveedor123!",
            Province = "Buenos Aires",
            Locality = "Tandil"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(command, CancellationToken.None));
            
        Assert.Contains("verificador", ex.Message);
    }
}
