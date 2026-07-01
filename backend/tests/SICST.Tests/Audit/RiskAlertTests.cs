using Microsoft.EntityFrameworkCore;
using SICST.Application.Audit.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Audit;

public class RiskAlertTests
{
    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options, new SICST.Tests.TestCurrentTenant());
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task GetRiskAlerts_ShouldDetectPabConcentrationAndMinimalDifference()
    {
        using var context = CreateDbContext();
        var companyId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        var supplierOne = CreateSupplier("Proveedor Uno");
        var supplierTwo = CreateSupplier("Proveedor Dos");
        var process = CreateProcess(companyId, buyerId, "PC-RISK-001");
        var auction = CreateAuction(companyId, process.Id);

        context.Users.Add(CreateUser(buyerId, companyId));
        context.Suppliers.AddRange(supplierOne, supplierTwo);
        context.PurchaseProcesses.Add(process);
        context.Auctions.Add(auction);

        var now = DateTime.UtcNow;
        context.Bids.AddRange(
            CreateBid(auction.Id, supplierOne.Id, 100m, now, isPab: true, sequence: 1),
            CreateBid(auction.Id, supplierOne.Id, 101m, now.AddSeconds(1), sequence: 2),
            CreateBid(auction.Id, supplierOne.Id, 102m, now.AddSeconds(2), sequence: 3),
            CreateBid(auction.Id, supplierOne.Id, 103m, now.AddSeconds(3), sequence: 4),
            CreateBid(auction.Id, supplierOne.Id, 104m, now.AddSeconds(4), sequence: 5),
            CreateBid(auction.Id, supplierOne.Id, 105m, now.AddSeconds(5), sequence: 6),
            CreateBid(auction.Id, supplierOne.Id, 106m, now.AddSeconds(6), sequence: 7),
            CreateBid(auction.Id, supplierTwo.Id, 100.50m, now.AddSeconds(7), sequence: 8),
            CreateBid(auction.Id, supplierTwo.Id, 110m, now.AddSeconds(8), sequence: 9),
            CreateBid(auction.Id, supplierTwo.Id, 120m, now.AddSeconds(9), sequence: 10));

        await context.SaveChangesAsync();

        var alerts = await new GetRiskAlertsQueryHandler(context)
            .Handle(new GetRiskAlertsQuery(companyId), CancellationToken.None);

        Assert.Contains(alerts, a => a.Code == "pab" && a.Severity == "high");
        Assert.Contains(alerts, a => a.Code == "bid_concentration" && a.MetricValue == 70m);
        Assert.Contains(alerts, a => a.Code == "minimal_difference");
        Assert.DoesNotContain(alerts, a => a.Code == "single_offerer");
    }

    [Fact]
    public async Task GetRiskAlerts_ShouldDetectSingleOffererAndNoBids()
    {
        using var context = CreateDbContext();
        var companyId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        var supplier = CreateSupplier("Proveedor Solo");
        var processOne = CreateProcess(companyId, buyerId, "PC-RISK-002");
        var processTwo = CreateProcess(companyId, buyerId, "PC-RISK-003");
        var auctionOne = CreateAuction(companyId, processOne.Id);
        var auctionTwo = CreateAuction(companyId, processTwo.Id);

        context.Users.Add(CreateUser(buyerId, companyId));
        context.Suppliers.Add(supplier);
        context.PurchaseProcesses.AddRange(processOne, processTwo);
        context.Auctions.AddRange(auctionOne, auctionTwo);
        context.Bids.Add(CreateBid(auctionOne.Id, supplier.Id, 90m, DateTime.UtcNow, sequence: 1));
        await context.SaveChangesAsync();

        var alerts = await new GetRiskAlertsQueryHandler(context)
            .Handle(new GetRiskAlertsQuery(companyId), CancellationToken.None);

        Assert.Contains(alerts, a => a.PurchaseProcessId == processOne.Id && a.Code == "single_offerer");
        Assert.Contains(alerts, a => a.PurchaseProcessId == processTwo.Id && a.Code == "no_bids");
    }

    private static User CreateUser(Guid id, Guid companyId)
    {
        return new User
        {
            Id = id,
            CompanyId = companyId,
            Email = $"{id:N}@test.com",
            PasswordHash = "hash",
            FirstName = "Aud",
            LastName = "Itor",
            Role = UserRole.Comprador,
            Active = true
        };
    }

    private static Supplier CreateSupplier(string businessName)
    {
        return new Supplier
        {
            Id = Guid.NewGuid(),
            Cuit = Random.Shared.NextInt64(20_000_000_000, 30_999_999_999).ToString(),
            BusinessName = businessName,
            Email = $"{Guid.NewGuid():N}@supplier.test",
            BusinessCategory = "Servicios",
            Province = "Buenos Aires",
            Locality = "La Plata",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private static PurchaseProcess CreateProcess(Guid companyId, Guid buyerId, string code)
    {
        return new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = code,
            Title = $"Proceso {code}",
            EstimatedBudget = 1000m,
            Status = PurchaseProcessStatus.InAuction,
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    private static Auction CreateAuction(Guid companyId, Guid processId)
    {
        return new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            PurchaseProcessId = processId,
            BasePrice = 1000m,
            MinimumDecrementPercentage = 1m,
            Status = AuctionStatus.Closed,
            StartsAtUtc = DateTime.UtcNow.AddHours(-2),
            EndsAtUtc = DateTime.UtcNow.AddHours(-1),
            ClosedAtUtc = DateTime.UtcNow.AddHours(-1),
            PabThreshold = 120m
        };
    }

    private static Bid CreateBid(Guid auctionId, Guid supplierId, decimal amount, DateTime placedAt, bool isPab = false, int sequence = 1)
    {
        return new Bid
        {
            Id = Guid.NewGuid(),
            AuctionId = auctionId,
            SupplierId = supplierId,
            Amount = amount,
            PlacedAtUtc = placedAt,
            IsPab = isPab,
            SequenceNumber = sequence,
            Hash = Guid.NewGuid().ToString("N"),
            PreviousHash = string.Empty
        };
    }
}
