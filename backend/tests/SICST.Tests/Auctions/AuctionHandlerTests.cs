using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.Commands;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Infrastructure.Auctions;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Auctions;

public class AuctionHandlerTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options, new TestCurrentTenant());
        context.Database.EnsureCreated();
        return context;
    }

    private static IAuctionStateCache CreateCache() => new InMemoryAuctionStateCache();

    [Fact]
    public async Task StartAuction_ShouldCreateOpenAuctionWithInvitedParticipants()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var handler = new StartAuctionCommandHandler(context, CreateCache());

        var auction = await handler.Handle(new StartAuctionCommand
        {
            CompanyId = seed.CompanyId,
            PurchaseProcessId = seed.ProcessId,
            DurationMinutes = 10
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, auction.Id);
        Assert.Equal(AuctionStatus.Open, auction.Status);
        Assert.Equal(100000m, auction.BasePrice);
        Assert.Contains(seed.SupplierId, auction.ParticipantSupplierIds);
    }

    [Fact]
    public async Task PlaceBid_ShouldRejectBid_WhenNotBelowMinimumDecrement()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        var handler = new PlaceBidCommandHandler(context, cache);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 99500m
            }, CancellationToken.None));
    }

    [Fact]
    public async Task PlaceBid_ShouldAcceptBid_WhenBelowCurrentPriceAndMinimumDecrement()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        var bid = await new PlaceBidCommandHandler(context, cache)
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        Assert.Equal(98000m, bid.Amount);
    }

    [Fact]
    public async Task PlaceBid_ShouldRejectBid_WhenAuctionIsClosed()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        await new CloseAuctionCommandHandler(context, cache)
            .Handle(new CloseAuctionCommand(seed.CompanyId, auction.Id), CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new PlaceBidCommandHandler(context, cache).Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None));
    }

    [Fact]
    public async Task PlaceBid_ShouldExtendAuction_WhenPlacedInLastThreeMinutes()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        
        // Start auction with only 2 minutes duration (so the end is within the 3-minute window)
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 2
            }, CancellationToken.None);

        var originalEndsAt = auction.EndsAtUtc;

        var bid = await new PlaceBidCommandHandler(context, cache)
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        // Fetch auction from database to verify extension
        var updatedAuction = await context.Auctions.FindAsync(auction.Id);
        
        Assert.NotNull(updatedAuction);
        Assert.True(updatedAuction.EndsAtUtc > originalEndsAt);
        // It should be extended to roughly 3 minutes from now
        var diff = updatedAuction.EndsAtUtc - DateTime.UtcNow;
        Assert.True(diff.TotalMinutes > 2.5 && diff.TotalMinutes <= 3.1);
    }

    private static async Task<(Guid CompanyId, Guid ProcessId, Guid SupplierId)> SeedPublishedProcessWithSupplier(ApplicationDbContext context)
    {
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Municipio Test",
            Domain = $"municipio-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        var buyer = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = $"comprador-{Guid.NewGuid():N}@test.com",
            PasswordHash = "hash",
            FirstName = "Comprador",
            LastName = "Test",
            Role = UserRole.Comprador,
            Active = true
        };

        var supplierUser = new User
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
            UserId = supplierUser.Id,
            Cuit = $"30-{Random.Shared.Next(10000000, 99999999)}-1",
            BusinessName = "Proveedor Test",
            Email = supplierUser.Email,
            BusinessCategory = "Servicios",
            Province = "Tucuman",
            Locality = "San Miguel",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        var configuration = new CompanyConfiguration
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            DefaultCurrency = "ARS",
            TimeZone = "America/Argentina/Buenos_Aires",
            MinimumBidDecrementPercentage = 1,
            AuctionExtensionMinutes = 2,
            RequireSupplierVerification = true,
            UpdatedAtUtc = DateTime.UtcNow
        };

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            BuyerId = buyer.Id,
            Code = "PC-0001",
            Title = "Compra Test",
            Description = "Proceso para subasta",
            EstimatedBudget = 100000m,
            Status = PurchaseProcessStatus.Approved,
            CreatedAtUtc = DateTime.UtcNow,
            PublishedAtUtc = DateTime.UtcNow
        };

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplier.Id,
            Status = InvitationStatus.Pending,
            InvitedAtUtc = DateTime.UtcNow
        };

        context.Companies.Add(company);
        context.Users.AddRange(buyer, supplierUser);
        context.Suppliers.Add(supplier);
        context.CompanyConfigurations.Add(configuration);
        context.PurchaseProcesses.Add(process);
        context.Invitations.Add(invitation);
        await context.SaveChangesAsync();

        return (company.Id, process.Id, supplier.Id);
    }
}
