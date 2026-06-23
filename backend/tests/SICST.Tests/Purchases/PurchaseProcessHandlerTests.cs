using Microsoft.EntityFrameworkCore;
using SICST.Application.Purchases.Commands;
using SICST.Application.Purchases.DTOs;
using SICST.Application.Purchases.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Purchases;

public class PurchaseProcessHandlerTests
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
    public async Task CreatePurchaseProcess_ShouldPersistDraftWithItems()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var handler = new CreatePurchaseProcessCommandHandler(context);

        var result = await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = companyId,
            BuyerId = buyerId,
            Title = "Compra de insumos",
            Description = "Insumos de limpieza",
            EstimatedBudget = 500000,
            Items =
            [
                new PurchaseItemInputDto
                {
                    Description = "Detergente",
                    Quantity = 100,
                    Unit = "unidad",
                    EstimatedUnitPrice = 1200
                }
            ]
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("PC-0001", result.Code);
        Assert.Equal(PurchaseProcessStatus.Draft, result.Status);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task PublishPurchaseProcess_ShouldMoveDraftToPublished()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var created = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de notebooks",
                EstimatedBudget = 2000000
            }, CancellationToken.None);

        var published = await new PublishPurchaseProcessCommandHandler(context)
            .Handle(new PublishPurchaseProcessCommand(companyId, created.Id), CancellationToken.None);

        Assert.NotNull(published);
        Assert.Equal(PurchaseProcessStatus.Published, published.Status);
        Assert.NotNull(published.PublishedAtUtc);
    }

    [Fact]
    public async Task InviteSupplier_ShouldPreventDuplicateInvitation()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var supplierId = await SeedSupplier(context);
        var process = await new CreatePurchaseProcessCommandHandler(context)
            .Handle(new CreatePurchaseProcessCommand
            {
                CompanyId = companyId,
                BuyerId = buyerId,
                Title = "Compra de mobiliario",
                EstimatedBudget = 750000
            }, CancellationToken.None);

        var handler = new InviteSupplierCommandHandler(context);
        var command = new InviteSupplierCommand
        {
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            SupplierId = supplierId
        };

        var invitation = await handler.Handle(command, CancellationToken.None);

        Assert.Equal(InvitationStatus.Pending, invitation.Status);
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task GetPurchaseProcesses_ShouldFilterByCompany()
    {
        using var context = CreateDbContext();
        var (companyId, buyerId) = await SeedCompanyAndBuyer(context);
        var (otherCompanyId, otherBuyerId) = await SeedCompanyAndBuyer(context, "otra");
        var handler = new CreatePurchaseProcessCommandHandler(context);

        await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = companyId,
            BuyerId = buyerId,
            Title = "Proceso propio"
        }, CancellationToken.None);

        await handler.Handle(new CreatePurchaseProcessCommand
        {
            CompanyId = otherCompanyId,
            BuyerId = otherBuyerId,
            Title = "Proceso ajeno"
        }, CancellationToken.None);

        var result = await new GetPurchaseProcessesQueryHandler(context)
            .Handle(new GetPurchaseProcessesQuery(companyId), CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("Proceso propio", result[0].Title);
    }

    private static async Task<(Guid companyId, Guid buyerId)> SeedCompanyAndBuyer(ApplicationDbContext context, string suffix = "test")
    {
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = $"Municipio {suffix}",
            Domain = $"municipio-{suffix}-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        var buyer = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = $"comprador-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Comprador",
            LastName = suffix,
            Role = UserRole.Comprador,
            Active = true
        };

        context.Companies.Add(company);
        context.Users.Add(buyer);
        await context.SaveChangesAsync();
        return (company.Id, buyer.Id);
    }

    private static async Task<Guid> SeedSupplier(ApplicationDbContext context)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"proveedor-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "",
            Role = UserRole.Proveedor,
            Active = true
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Cuit = $"30-{Random.Shared.Next(10000000, 99999999)}-1",
            BusinessName = "Proveedor Test",
            Email = user.Email,
            Province = "Tucuman",
            Locality = "San Miguel",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.Add(user);
        context.Suppliers.Add(supplier);
        await context.SaveChangesAsync();
        return supplier.Id;
    }
}
