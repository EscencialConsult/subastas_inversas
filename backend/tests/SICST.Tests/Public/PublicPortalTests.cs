using Microsoft.EntityFrameworkCore;
using SICST.Application.Public.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Public;

public class PublicPortalTests
{
    private static ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var context = new ApplicationDbContext(options, new TestCurrentTenant());
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task GetPublicPurchaseProcessDetail_ShouldExposeFichaAuctionAndResults()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublicProcess(context, PurchaseProcessStatus.Adjudicated);
        var handler = new GetPublicPurchaseProcessDetailQueryHandler(context);

        var detail = await handler.Handle(
            new GetPublicPurchaseProcessDetailQuery(seed.ProcessId),
            CancellationToken.None);

        Assert.NotNull(detail);
        Assert.Equal("PP-100", detail.Code);
        Assert.Single(detail.Items);
        Assert.NotNull(detail.Auction);
        Assert.Equal(1, detail.Auction.BidCount);
        Assert.Single(detail.Auction.Ranking);
        Assert.Single(detail.Awards);
        Assert.Equal("Proveedor Uno", detail.Awards[0].SupplierName);
    }

    [Fact]
    public async Task GetPublicPurchaseProcessDetail_ShouldHideDraftProcesses()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublicProcess(context, PurchaseProcessStatus.Draft);
        var handler = new GetPublicPurchaseProcessDetailQueryHandler(context);

        var detail = await handler.Handle(
            new GetPublicPurchaseProcessDetailQuery(seed.ProcessId),
            CancellationToken.None);

        Assert.Null(detail);
    }

    [Fact]
    public async Task GetPublicOcdsReleases_ShouldPublishReleasesByStage()
    {
        using var context = CreateDbContext();
        await SeedPublicProcess(context, PurchaseProcessStatus.Contracted);
        var handler = new GetPublicOcdsReleasesQueryHandler(context);

        var package = await handler.Handle(
            new GetPublicOcdsReleasesQuery(Stage: "implementation"),
            CancellationToken.None);

        var release = Assert.Single(package.Releases);
        Assert.Contains("planning", release.Tag);
        Assert.Contains("tender", release.Tag);
        Assert.Contains("auction", release.Tag);
        Assert.Contains("award", release.Tag);
        Assert.Contains("contract", release.Tag);
        Assert.Contains("implementation", release.Tag);
        Assert.Single(release.Tender.Items);
        Assert.NotNull(release.Tender.Auction);
        Assert.Single(release.Awards);
        Assert.Single(release.Contracts);
        Assert.Single(release.Implementation.Transactions);
    }

    [Fact]
    public async Task GetPublicOcdsReleases_ShouldFilterByRequestedStage()
    {
        using var context = CreateDbContext();
        await SeedPublicProcess(context, PurchaseProcessStatus.Approved);
        var handler = new GetPublicOcdsReleasesQueryHandler(context);

        var package = await handler.Handle(
            new GetPublicOcdsReleasesQuery(Stage: "award"),
            CancellationToken.None);

        Assert.Empty(package.Releases);
    }

    private static async Task<SeedResult> SeedPublicProcess(
        ApplicationDbContext context,
        PurchaseProcessStatus status)
    {
        var companyId = Guid.NewGuid();
        var buyerId = Guid.NewGuid();
        var supplierUserId = Guid.NewGuid();
        var supplierId = Guid.NewGuid();
        var processId = Guid.NewGuid();
        var auctionId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var awardId = Guid.NewGuid();
        var contractId = Guid.NewGuid();

        var company = new Company
        {
            Id = companyId,
            Name = "Municipio Transparente",
            Domain = "municipio.test",
            IsPublicEntity = true
        };
        var buyer = new User
        {
            Id = buyerId,
            CompanyId = companyId,
            Email = "comprador@municipio.test",
            PasswordHash = "hash",
            FirstName = "Comprador",
            LastName = "Municipal",
            Role = UserRole.Comprador,
            Active = true
        };
        var supplierUser = new User
        {
            Id = supplierUserId,
            Email = "proveedor@test.com",
            PasswordHash = "hash",
            FirstName = "Proveedor",
            LastName = "Uno",
            Role = UserRole.Proveedor,
            Active = true
        };
        var supplier = new Supplier
        {
            Id = supplierId,
            UserId = supplierUserId,
            User = supplierUser,
            BusinessName = "Proveedor Uno",
            Cuit = "30-11111111-1",
            Email = "proveedor@test.com",
            Status = SupplierStatus.Verified,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-10)
        };
        var process = new PurchaseProcess
        {
            Id = processId,
            CompanyId = companyId,
            Company = company,
            BuyerId = buyerId,
            Buyer = buyer,
            Code = "PP-100",
            Title = "Insumos publicados",
            Description = "Compra visible en portal ciudadano",
            EstimatedBudget = 150000m,
            Status = status,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-3),
            PublishedAtUtc = DateTime.UtcNow.AddDays(-2),
            SpecificationsHash = "abc123"
        };

        var item = new PurchaseItem
        {
            Id = itemId,
            PurchaseProcessId = processId,
            PurchaseProcess = process,
            Description = "Notebook",
            Quantity = 3,
            Unit = "unidad",
            EstimatedUnitPrice = 50000m
        };
        var auction = new Auction
        {
            Id = auctionId,
            CompanyId = companyId,
            Company = company,
            PurchaseProcessId = processId,
            PurchaseProcess = process,
            BasePrice = 150000m,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(-20),
            EndsAtUtc = DateTime.UtcNow.AddMinutes(-5),
            Status = AuctionStatus.Closed,
            ClosedAtUtc = DateTime.UtcNow.AddMinutes(-5)
        };
        var participant = new AuctionParticipant
        {
            Id = Guid.NewGuid(),
            AuctionId = auctionId,
            Auction = auction,
            SupplierId = supplierId,
            Supplier = supplier,
            JoinedAtUtc = DateTime.UtcNow.AddMinutes(-30)
        };
        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            AuctionId = auctionId,
            Auction = auction,
            SupplierId = supplierId,
            Supplier = supplier,
            Amount = 120000m,
            PlacedAtUtc = DateTime.UtcNow.AddMinutes(-10),
            SequenceNumber = 1,
            PreviousHash = string.Empty,
            Hash = "bid-hash"
        };
        var award = new Award
        {
            Id = awardId,
            PurchaseProcessId = processId,
            PurchaseProcess = process,
            SupplierId = supplierId,
            Supplier = supplier,
            Amount = 120000m,
            AdjudicatedById = buyerId,
            AdjudicatedBy = buyer,
            AdjudicatedAtUtc = DateTime.UtcNow.AddMinutes(-2),
            Observations = "Mejor oferta",
            DocumentHash = "award-hash",
            ImmutableHash = "immutable-hash"
        };
        var contract = new Contract
        {
            Id = contractId,
            CompanyId = companyId,
            Company = company,
            PurchaseProcessId = processId,
            PurchaseProcess = process,
            AwardId = awardId,
            Award = award,
            SupplierId = supplierId,
            Supplier = supplier,
            Number = "CONT-100",
            Amount = 120000m,
            StartDateUtc = DateTime.UtcNow.AddDays(-1),
            CreatedAtUtc = DateTime.UtcNow.AddDays(-1),
            SignedAtUtc = DateTime.UtcNow.AddDays(-1),
            Status = ContractStatus.Active,
            SignatureHash = "contract-signature"
        };
        var payment = new ContractPayment
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Company = company,
            ContractId = contractId,
            Contract = contract,
            RegisteredById = buyerId,
            RegisteredBy = buyer,
            PaymentDateUtc = DateTime.UtcNow,
            PaymentAmount = 50000m,
            PenaltyAmount = 0,
            DelayDays = 0,
            CreatedAtUtc = DateTime.UtcNow
        };

        process.Items.Add(item);
        if (status >= PurchaseProcessStatus.Adjudicated)
        {
            process.Awards.Add(award);
        }

        if (status >= PurchaseProcessStatus.Contracted)
        {
            process.Contracts.Add(contract);
            contract.Payments.Add(payment);
        }

        auction.Participants.Add(participant);
        auction.Bids.Add(bid);

        context.Companies.Add(company);
        context.Users.Add(buyer);
        context.Users.Add(supplierUser);
        context.Suppliers.Add(supplier);
        context.PurchaseProcesses.Add(process);
        context.PurchaseItems.Add(item);
        context.Auctions.Add(auction);
        context.AuctionParticipants.Add(participant);
        context.Bids.Add(bid);
        if (status >= PurchaseProcessStatus.Adjudicated)
        {
            context.Awards.Add(award);
        }

        if (status >= PurchaseProcessStatus.Contracted)
        {
            context.Contracts.Add(contract);
            context.ContractPayments.Add(payment);
        }
        await context.SaveChangesAsync();

        return new SeedResult(processId);
    }

    private sealed record SeedResult(Guid ProcessId);
}
