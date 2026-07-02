using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Audit.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Audit;

public class IntegrityVerificationTests
{
    private static ApplicationDbContext CreateDbContext()
    {
        return TestDbContextFactory.Create(new SICST.Tests.TestCurrentTenant());
    }

    [Fact]
    public async Task VerifyIntegrity_ShouldDetectAuditChainTampering()
    {
        using var context = CreateDbContext();
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Municipio Integridad",
            Domain = $"integridad-{Guid.NewGuid():N}",
            IsPublicEntity = true
        };

        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var auditEvent = await context.AuditEvents.SingleAsync();
        auditEvent.Payload = "{}";

        var result = await new VerifyIntegrityQueryHandler(context)
            .Handle(new VerifyIntegrityQuery(), CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Contains(result.Findings, f => f.Scope == "audit_chain" && f.EntityName == nameof(AuditEvent));
    }

    [Fact]
    public async Task VerifyIntegrity_ShouldDetectBidHashTampering()
    {
        using var context = CreateDbContext();
        var companyId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        var supplier = CreateSupplier();
        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            BuyerId = buyerId,
            Code = "PC-INTEGRITY",
            Title = "Proceso integridad",
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
        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            AuctionId = auction.Id,
            SupplierId = supplier.Id,
            Amount = 900,
            PlacedAtUtc = DateTime.UtcNow.AddMinutes(-90),
            SequenceNumber = 1,
            PreviousHash = string.Empty
        };
        bid.Hash = ComputeBidHash(bid);

        context.Users.Add(CreateUser(buyerId, companyId));
        context.Suppliers.Add(supplier);
        context.PurchaseProcesses.Add(process);
        context.Auctions.Add(auction);
        context.Bids.Add(bid);
        await context.SaveChangesAsync();

        bid.Amount = 850;

        var result = await new VerifyIntegrityQueryHandler(context)
            .Handle(new VerifyIntegrityQuery(companyId), CancellationToken.None);

        Assert.False(result.IsValid);
        Assert.Contains(result.Findings, f => f.Scope == "bid_chain" && f.EntityName == nameof(Bid));
    }

    private static string ComputeBidHash(Bid bid)
    {
        var material = string.Join("|",
            bid.AuctionId,
            bid.Id,
            bid.SupplierId,
            bid.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            bid.PlacedAtUtc.ToString("O", CultureInfo.InvariantCulture),
            bid.SequenceNumber,
            bid.PreviousHash);

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material))).ToLowerInvariant();
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

    private static Supplier CreateSupplier()
    {
        return new Supplier
        {
            Id = Guid.NewGuid(),
            Cuit = Random.Shared.NextInt64(20_000_000_000, 30_999_999_999).ToString(),
            BusinessName = "Proveedor Integridad",
            Email = $"{Guid.NewGuid():N}@supplier.test",
            BusinessCategory = "Servicios",
            Province = "Buenos Aires",
            Locality = "La Plata",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
