using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Audit.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Audit;

public class AuditPanelExportTests
{
    private const string SigningKey = "SICST_Audit_Csv_Signing_Secret_Key_2026";

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
    public async Task GetRiskDashboard_ShouldSummarizeRiskAndIntegrity()
    {
        using var context = CreateDbContext();
        var seeded = await SeedSingleOffererAuction(context);

        var dashboard = await new GetRiskDashboardQueryHandler(context)
            .Handle(new GetRiskDashboardQuery(seeded.CompanyId), CancellationToken.None);

        Assert.Equal(1, dashboard.TotalProcesses);
        Assert.Equal(1, dashboard.TotalAuctions);
        Assert.True(dashboard.TotalAlerts >= 1);
        Assert.True(dashboard.HighRiskAlerts >= 1);
        Assert.Equal(1, dashboard.ProcessesWithAlerts);
        Assert.Single(dashboard.TopRiskProcesses);
        Assert.Equal(seeded.ProcessId, dashboard.TopRiskProcesses[0].PurchaseProcessId);
    }

    [Fact]
    public async Task ExportSignedAuditCsv_ShouldIncludeVerifiableHashAndSignature()
    {
        using var context = CreateDbContext();
        var seeded = await SeedSingleOffererAuction(context);

        var export = await new ExportSignedAuditCsvQueryHandler(context)
            .Handle(new ExportSignedAuditCsvQuery(seeded.CompanyId), CancellationToken.None);

        Assert.EndsWith(".csv", export.FileName);
        Assert.Contains("Reporte de auditoria SICST", export.CsvContent);
        Assert.Contains("Firma digital del reporte", export.CsvContent);
        Assert.Contains(export.Sha256Hash, export.CsvContent);
        Assert.Contains(export.Signature, export.CsvContent);

        var body = export.CsvContent[..export.CsvContent.IndexOf("Firma digital del reporte", StringComparison.Ordinal)];
        var expectedHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
        var expectedSignature = Convert.ToHexString(HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(SigningKey),
            Encoding.UTF8.GetBytes(expectedHash))).ToLowerInvariant();

        Assert.Equal(expectedHash, export.Sha256Hash);
        Assert.Equal(expectedSignature, export.Signature);
    }

    private static async Task<(Guid CompanyId, Guid ProcessId)> SeedSingleOffererAuction(ApplicationDbContext context)
    {
        var companyId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            Cuit = Random.Shared.NextInt64(20_000_000_000, 30_999_999_999).ToString(),
            BusinessName = "Proveedor Panel",
            Email = $"{Guid.NewGuid():N}@supplier.test",
            BusinessCategory = "Servicios",
            Province = "Buenos Aires",
            Locality = "La Plata",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };
        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-PANEL",
            Title = "Proceso panel",
            EstimatedBudget = 1000,
            Status = PurchaseProcessStatus.InAuction,
            CreatedAtUtc = DateTime.UtcNow
        };
        var auction = new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            PurchaseProcessId = process.Id,
            BasePrice = 1000,
            MinimumDecrementPercentage = 1,
            Status = AuctionStatus.Closed,
            StartsAtUtc = DateTime.UtcNow.AddHours(-2),
            EndsAtUtc = DateTime.UtcNow.AddHours(-1),
            ClosedAtUtc = DateTime.UtcNow.AddHours(-1)
        };

        context.Users.Add(new User
        {
            Id = buyerId,
            CompanyId = companyId,
            Email = $"{buyerId:N}@test.com",
            PasswordHash = "hash",
            FirstName = "Aud",
            LastName = "Itor",
            Role = UserRole.Comprador,
            Active = true
        });
        context.Suppliers.Add(supplier);
        context.PurchaseProcesses.Add(process);
        context.Auctions.Add(auction);
        context.Bids.Add(new Bid
        {
            Id = Guid.NewGuid(),
            AuctionId = auction.Id,
            SupplierId = supplier.Id,
            Amount = 900,
            PlacedAtUtc = DateTime.UtcNow.AddMinutes(-90),
            SequenceNumber = 1,
            PreviousHash = string.Empty,
            Hash = "test-hash"
        });

        await context.SaveChangesAsync();
        return (companyId, process.Id);
    }
}
