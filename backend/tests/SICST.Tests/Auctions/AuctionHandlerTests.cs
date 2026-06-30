using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SICST.Api.Hubs;
using SICST.Api.Services;
using SICST.Application.Auctions;
using SICST.Application.Auctions.Commands;
using SICST.Application.Auctions.DTOs;
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

    private static ApplicationDbContext CreateDbContext(DbContextOptions<ApplicationDbContext> options)
    {
        var context = new ApplicationDbContext(options, new TestCurrentTenant());
        context.Database.EnsureCreated();
        return context;
    }

    private static IAuctionStateCache CreateCache() => new InMemoryAuctionStateCache();
    private static IAuctionBidLock CreateBidLock() => new InMemoryAuctionBidLock();

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
    public async Task StartAuction_ShouldCreateScheduledAuction_WhenStartIsInFuture()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var handler = new StartAuctionCommandHandler(context, CreateCache());

        var auction = await handler.Handle(new StartAuctionCommand
        {
            CompanyId = seed.CompanyId,
            PurchaseProcessId = seed.ProcessId,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(5),
            DurationMinutes = 10
        }, CancellationToken.None);

        Assert.Equal(AuctionStatus.Scheduled, auction.Status);
        Assert.Contains(seed.SupplierId, auction.ParticipantSupplierIds);

        var process = await context.PurchaseProcesses.FindAsync(seed.ProcessId);
        Assert.NotNull(process);
        Assert.Equal(PurchaseProcessStatus.Approved, process.Status);
    }

    [Fact]
    public async Task Scheduler_ShouldOpenScheduledAuctionAndNotifyParticipants()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var emailSender = new RecordingEmailSender();
        var hubProxy = new RecordingClientProxy();

        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                StartsAtUtc = DateTime.UtcNow.AddMinutes(5),
                DurationMinutes = 10
            }, CancellationToken.None);

        var scheduled = await context.Auctions.FindAsync(auction.Id);
        Assert.NotNull(scheduled);
        scheduled.StartsAtUtc = DateTime.UtcNow.AddMinutes(-1);
        scheduled.EndsAtUtc = DateTime.UtcNow.AddMinutes(9);
        await context.SaveChangesAsync();

        await CreateScheduler(context, cache, emailSender, hubProxy).RunOnce(CancellationToken.None);

        var opened = await context.Auctions.FindAsync(auction.Id);
        var process = await context.PurchaseProcesses.FindAsync(seed.ProcessId);

        Assert.NotNull(opened);
        Assert.NotNull(process);
        Assert.Equal(AuctionStatus.Open, opened.Status);
        Assert.Equal(PurchaseProcessStatus.InAuction, process.Status);
        Assert.Contains(hubProxy.Messages, m => m.Method == "AuctionOpened");
        Assert.Contains(emailSender.Messages, m => m.To == seed.SupplierEmail && m.Subject.StartsWith("Subasta abierta:"));
        Assert.Contains(emailSender.Messages, m => m.To == seed.BuyerEmail && m.Subject.StartsWith("Subasta abierta:"));
    }

    [Fact]
    public async Task Scheduler_ShouldCloseExpiredAuctionAndNotifyParticipants()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var emailSender = new RecordingEmailSender();
        var hubProxy = new RecordingClientProxy();

        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        var open = await context.Auctions.FindAsync(auction.Id);
        Assert.NotNull(open);
        open.EndsAtUtc = DateTime.UtcNow.AddMinutes(-1);
        await context.SaveChangesAsync();

        await CreateScheduler(context, cache, emailSender, hubProxy).RunOnce(CancellationToken.None);

        var closed = await context.Auctions.FindAsync(auction.Id);
        var process = await context.PurchaseProcesses.FindAsync(seed.ProcessId);

        Assert.NotNull(closed);
        Assert.NotNull(process);
        Assert.Equal(AuctionStatus.Closed, closed.Status);
        Assert.NotNull(closed.ClosedAtUtc);
        Assert.Equal(PurchaseProcessStatus.Evaluation, process.Status);
        Assert.Equal(closed.ClosedAtUtc, process.ClosedAtUtc);
        Assert.Contains(hubProxy.Messages, m => m.Method == "AuctionClosed");
        Assert.Contains(emailSender.Messages, m => m.To == seed.SupplierEmail && m.Subject.StartsWith("Subasta cerrada:"));
        Assert.Contains(emailSender.Messages, m => m.To == seed.BuyerEmail && m.Subject.StartsWith("Subasta cerrada:"));
    }

    [Fact]
    public async Task PlaceBid_ShouldRejectBid_WhenAuctionIsScheduled()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                StartsAtUtc = DateTime.UtcNow.AddMinutes(5),
                DurationMinutes = 10
            }, CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new PlaceBidCommandHandler(context, cache, CreateBidLock()).Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None));
    }

    [Fact]
    public async Task CloseAuction_ShouldRejectClose_WhenAuctionIsScheduled()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                StartsAtUtc = DateTime.UtcNow.AddMinutes(5),
                DurationMinutes = 10
            }, CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new CloseAuctionCommandHandler(context, cache)
                .Handle(new CloseAuctionCommand(seed.CompanyId, auction.Id), CancellationToken.None));
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

        var handler = new PlaceBidCommandHandler(context, cache, CreateBidLock());

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

        var bid = await new PlaceBidCommandHandler(context, cache, CreateBidLock())
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        Assert.Equal(98000m, bid.Amount);
        Assert.Equal(1, bid.SequenceNumber);
        Assert.NotEqual(default, bid.PlacedAtUtc);
        Assert.Equal(string.Empty, bid.PreviousHash);
        Assert.Equal(64, bid.Hash.Length);
    }

    [Fact]
    public async Task PlaceBid_ShouldAccept50ConcurrentSuppliersWithoutBidLossAndKeepHashChainIntegrity()
    {
        var databaseRoot = new InMemoryDatabaseRoot();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"auction-load-{Guid.NewGuid():N}", databaseRoot)
            .Options;
        var cache = CreateCache();
        var bidLock = CreateBidLock();
        Guid auctionId;
        List<Guid> supplierIds;

        await using (var seedContext = CreateDbContext(options))
        {
            var seed = await SeedPublishedProcessWithSuppliers(seedContext, supplierCount: 50);
            supplierIds = seed.SupplierIds;
            var auction = await new StartAuctionCommandHandler(seedContext, cache)
                .Handle(new StartAuctionCommand
                {
                    CompanyId = seed.CompanyId,
                    PurchaseProcessId = seed.ProcessId,
                    DurationMinutes = 10
                }, CancellationToken.None);
            auctionId = auction.Id;
        }

        using var startGate = new ManualResetEventSlim(false);
        var bidTasks = supplierIds.Select(supplierId => Task.Run(async () =>
        {
            startGate.Wait();
            return await PlaceBidWithRetry(options, cache, bidLock, auctionId, supplierId);
        })).ToList();

        startGate.Set();
        var acceptedBids = await Task.WhenAll(bidTasks);

        await using var verificationContext = CreateDbContext(options);
        var bids = await verificationContext.Bids
            .Include(b => b.Supplier)
            .Where(b => b.AuctionId == auctionId)
            .OrderBy(b => b.SequenceNumber)
            .ToListAsync();

        Assert.Equal(50, acceptedBids.Length);
        Assert.Equal(50, bids.Count);
        Assert.Equal(50, bids.Select(b => b.SupplierId).Distinct().Count());
        Assert.Equal(Enumerable.Range(1, 50), bids.Select(b => b.SequenceNumber));

        var previousHash = string.Empty;
        foreach (var bid in bids)
        {
            Assert.Equal(previousHash, bid.PreviousHash);
            Assert.Equal(ComputeExpectedBidHash(bid), bid.Hash);
            previousHash = bid.Hash;
        }
    }

    [Fact]
    public async Task PublicSnapshot_ShouldAnonymizeRankingUntilAuctionIsClosed()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var publicCache = new InMemoryPublicAuctionSnapshotCache();
        var auction = await new StartAuctionCommandHandler(context, cache, publicCache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        await new PlaceBidCommandHandler(context, cache, CreateBidLock(), publicCache)
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        var openSnapshot = await publicCache.GetAsync(auction.Id, CancellationToken.None);

        Assert.NotNull(openSnapshot);
        Assert.False(openSnapshot.IdentitiesRevealed);
        var openRank = Assert.Single(openSnapshot.Ranking);
        Assert.Equal(Guid.Empty, openRank.SupplierId);
        Assert.Equal("Oferente 1", openRank.DisplayName);
        Assert.Equal(98000m, openRank.Amount);

        await new CloseAuctionCommandHandler(context, cache, publicCache)
            .Handle(new CloseAuctionCommand(seed.CompanyId, auction.Id), CancellationToken.None);

        var closedSnapshot = await publicCache.GetAsync(auction.Id, CancellationToken.None);

        Assert.NotNull(closedSnapshot);
        Assert.True(closedSnapshot.IdentitiesRevealed);
        var closedRank = Assert.Single(closedSnapshot.Ranking);
        Assert.Equal(seed.SupplierId, closedRank.SupplierId);
        Assert.Equal(seed.SupplierName, closedRank.DisplayName);
    }

    [Fact]
    public async Task PlaceBid_ShouldMarkBidAsPab_WhenBelowThreshold()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10,
                PabThreshold = 99000m
            }, CancellationToken.None);

        var bid = await new PlaceBidCommandHandler(context, cache, CreateBidLock())
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        Assert.True(bid.IsPab);
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
            new PlaceBidCommandHandler(context, cache, CreateBidLock()).Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None));
    }

    [Fact]
    public async Task CloseAuction_ShouldGenerateClosingActHashSavingsAndComparison()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();
        var pdf = new RecordingPdfGenerator();
        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10
            }, CancellationToken.None);

        await new PlaceBidCommandHandler(context, cache, CreateBidLock())
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        var closed = await new CloseAuctionCommandHandler(context, cache, pdfGenerator: pdf)
            .Handle(new CloseAuctionCommand(seed.CompanyId, auction.Id), CancellationToken.None);

        Assert.NotNull(closed);
        Assert.Equal(AuctionStatus.Closed, closed.Status);
        Assert.Equal(2000m, closed.SavingsAmount);
        Assert.Equal(2m, closed.SavingsPercentage);
        Assert.NotNull(closed.ClosingActHash);
        Assert.Equal(64, closed.ClosingActHash.Length);
        Assert.NotNull(closed.ClosingActUrl);
        var row = Assert.Single(closed.ComparisonRows);
        Assert.Equal(seed.SupplierId, row.SupplierId);
        Assert.Equal(seed.SupplierName, row.SupplierName);
        Assert.Equal(98000m, row.BestAmount);
        Assert.Equal(2000m, row.SavingsAmount);
        Assert.Equal(2m, row.SavingsPercentage);
        Assert.Equal(closed.ClosingActHash, pdf.Hash);
        Assert.Single(pdf.ComparisonRows);
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
                DurationMinutes = 2,
                AutoExtensionMinutes = 3
            }, CancellationToken.None);

        var originalEndsAt = auction.EndsAtUtc;

        var bid = await new PlaceBidCommandHandler(context, cache, CreateBidLock())
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        // Fetch auction from database to verify extension
        var updatedAuction = await context.Auctions.FindAsync(auction.Id);

        Assert.NotNull(updatedAuction);
        Assert.True(bid.AuctionExtended);
        Assert.Equal(updatedAuction.EndsAtUtc, bid.AuctionEndsAtUtc);
        Assert.True(updatedAuction.EndsAtUtc > originalEndsAt);
        // It should be extended to roughly 3 minutes from now
        var diff = updatedAuction.EndsAtUtc - DateTime.UtcNow;
        Assert.True(diff.TotalMinutes > 2.5 && diff.TotalMinutes <= 3.1);
    }

    [Fact]
    public async Task PlaceBid_ShouldNotExtendAuction_WhenOutsideExtensionWindow()
    {
        using var context = CreateDbContext();
        var seed = await SeedPublishedProcessWithSupplier(context);
        var cache = CreateCache();

        var auction = await new StartAuctionCommandHandler(context, cache)
            .Handle(new StartAuctionCommand
            {
                CompanyId = seed.CompanyId,
                PurchaseProcessId = seed.ProcessId,
                DurationMinutes = 10,
                AutoExtensionMinutes = 3
            }, CancellationToken.None);

        var bid = await new PlaceBidCommandHandler(context, cache, CreateBidLock())
            .Handle(new PlaceBidCommand
            {
                AuctionId = auction.Id,
                SupplierId = seed.SupplierId,
                Amount = 98000m
            }, CancellationToken.None);

        var updatedAuction = await context.Auctions.FindAsync(auction.Id);

        Assert.NotNull(updatedAuction);
        Assert.False(bid.AuctionExtended);
        Assert.Equal(updatedAuction.EndsAtUtc, bid.AuctionEndsAtUtc);
        Assert.Equal(auction.EndsAtUtc, updatedAuction.EndsAtUtc);
    }

    private static AuctionSchedulerService CreateScheduler(
        ApplicationDbContext context,
        IAuctionStateCache cache,
        IEmailSender emailSender,
        IClientProxy clientProxy)
    {
        var services = new ServiceCollection()
            .AddSingleton<IApplicationDbContext>(context)
            .AddSingleton(cache)
            .AddSingleton<IPublicAuctionSnapshotCache, InMemoryPublicAuctionSnapshotCache>()
            .AddSingleton<IPdfGenerator, RecordingPdfGenerator>()
            .AddSingleton(emailSender)
            .BuildServiceProvider();

        return new AuctionSchedulerService(
            services.GetRequiredService<IServiceScopeFactory>(),
            new RecordingHubContext(clientProxy),
            NullLogger<AuctionSchedulerService>.Instance);
    }

    private static async Task<BidDto> PlaceBidWithRetry(
        DbContextOptions<ApplicationDbContext> options,
        IAuctionStateCache cache,
        IAuctionBidLock bidLock,
        Guid auctionId,
        Guid supplierId)
    {
        for (var attempt = 0; attempt < 100; attempt++)
        {
            await using var context = CreateDbContext(options);
            var auction = await context.Auctions
                .Include(a => a.Bids)
                .FirstAsync(a => a.Id == auctionId);
            var currentPrice = auction.Bids.Count == 0 ? auction.BasePrice : auction.Bids.Min(b => b.Amount);
            var amount = Math.Round(currentPrice * 0.98m, 2);

            try
            {
                return await new PlaceBidCommandHandler(context, cache, bidLock)
                    .Handle(new PlaceBidCommand
                    {
                        AuctionId = auctionId,
                        SupplierId = supplierId,
                        Amount = amount
                    }, CancellationToken.None);
            }
            catch (InvalidOperationException ex) when (
                ex.Message.Contains("precio actual", StringComparison.OrdinalIgnoreCase)
                || ex.Message.Contains("decremento minimo", StringComparison.OrdinalIgnoreCase))
            {
                await Task.Delay(5);
            }
        }

        throw new InvalidOperationException($"No se pudo registrar lance concurrente para proveedor {supplierId}.");
    }

    private static string ComputeExpectedBidHash(Bid bid)
    {
        var material = string.Join("|",
            bid.AuctionId,
            bid.Id,
            bid.SupplierId,
            bid.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            bid.PlacedAtUtc.ToString("O", CultureInfo.InvariantCulture),
            bid.SequenceNumber,
            bid.PreviousHash);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static async Task<(Guid CompanyId, Guid ProcessId, Guid SupplierId, string SupplierEmail, string SupplierName, string BuyerEmail)> SeedPublishedProcessWithSupplier(ApplicationDbContext context)
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
            IsEvaluationActSigned = true,
            CreatedAtUtc = DateTime.UtcNow,
            PublishedAtUtc = DateTime.UtcNow
        };

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            SupplierId = supplier.Id,
            Status = InvitationStatus.Accepted,
            QualificationStatus = QualificationStatus.Approved,
            InvitedAtUtc = DateTime.UtcNow
        };

        context.Companies.Add(company);
        context.Users.AddRange(buyer, supplierUser);
        context.Suppliers.Add(supplier);
        context.CompanyConfigurations.Add(configuration);
        context.PurchaseProcesses.Add(process);
        context.Invitations.Add(invitation);
        await context.SaveChangesAsync();

        return (company.Id, process.Id, supplier.Id, supplier.Email, supplier.BusinessName, buyer.Email);
    }

    private static async Task<(Guid CompanyId, Guid ProcessId, List<Guid> SupplierIds)> SeedPublishedProcessWithSuppliers(
        ApplicationDbContext context,
        int supplierCount)
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
            Code = "PC-LOAD",
            Title = "Compra Test Carga",
            Description = "Proceso para prueba de concurrencia",
            EstimatedBudget = 100000m,
            Status = PurchaseProcessStatus.Approved,
            IsEvaluationActSigned = true,
            CreatedAtUtc = DateTime.UtcNow,
            PublishedAtUtc = DateTime.UtcNow
        };

        var supplierIds = new List<Guid>();
        var users = new List<User>();
        var suppliers = new List<Supplier>();
        var invitations = new List<Invitation>();

        for (var index = 0; index < supplierCount; index++)
        {
            var supplierUser = new User
            {
                Id = Guid.NewGuid(),
                Email = $"proveedor-{index}-{Guid.NewGuid():N}@test.com",
                PasswordHash = "hash",
                FirstName = "Proveedor",
                LastName = index.ToString(CultureInfo.InvariantCulture),
                Role = UserRole.Proveedor,
                Active = true
            };

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                UserId = supplierUser.Id,
                Cuit = $"30-{(10000000 + index):00000000}-1",
                BusinessName = $"Proveedor Test {index + 1}",
                Email = supplierUser.Email,
                BusinessCategory = "Servicios",
                Province = "Tucuman",
                Locality = "San Miguel",
                Status = SupplierStatus.Verified,
                ArcaVerified = true,
                CreatedAtUtc = DateTime.UtcNow
            };

            supplierIds.Add(supplier.Id);
            users.Add(supplierUser);
            suppliers.Add(supplier);
            invitations.Add(new Invitation
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = process.Id,
                SupplierId = supplier.Id,
                Status = InvitationStatus.Accepted,
                QualificationStatus = QualificationStatus.Approved,
                InvitedAtUtc = DateTime.UtcNow
            });
        }

        context.Companies.Add(company);
        context.Users.Add(buyer);
        context.Users.AddRange(users);
        context.Suppliers.AddRange(suppliers);
        context.CompanyConfigurations.Add(configuration);
        context.PurchaseProcesses.Add(process);
        context.Invitations.AddRange(invitations);
        await context.SaveChangesAsync();

        return (company.Id, process.Id, supplierIds);
    }

    private sealed class RecordingEmailSender : IEmailSender
    {
        public List<(string To, string Subject, string Body)> Messages { get; } = [];

        public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
        {
            Messages.Add((to, subject, body));
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingHubContext : IHubContext<AuctionHub>
    {
        public RecordingHubContext(IClientProxy clientProxy)
        {
            Clients = new RecordingHubClients(clientProxy);
            Groups = new RecordingGroupManager();
        }

        public IHubClients Clients { get; }
        public IGroupManager Groups { get; }
    }

    private sealed class RecordingHubClients : IHubClients
    {
        private readonly IClientProxy _clientProxy;

        public RecordingHubClients(IClientProxy clientProxy)
        {
            _clientProxy = clientProxy;
        }

        public IClientProxy All => _clientProxy;
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => _clientProxy;
        public IClientProxy Client(string connectionId) => _clientProxy;
        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => _clientProxy;
        public IClientProxy Group(string groupName) => _clientProxy;
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => _clientProxy;
        public IClientProxy Groups(IReadOnlyList<string> groupNames) => _clientProxy;
        public IClientProxy User(string userId) => _clientProxy;
        public IClientProxy Users(IReadOnlyList<string> userIds) => _clientProxy;
    }

    private sealed class RecordingGroupManager : IGroupManager
    {
        public Task AddToGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveFromGroupAsync(string connectionId, string groupName, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class RecordingClientProxy : IClientProxy
    {
        public List<(string Method, object?[] Args)> Messages { get; } = [];

        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            Messages.Add((method, args));
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingPdfGenerator : IPdfGenerator
    {
        public string? Hash { get; private set; }
        public List<AuctionComparisonRow> ComparisonRows { get; private set; } = [];

        public string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids, DocumentTemplate? template = null)
        {
            return "/dummy/path/award.pdf";
        }

        public string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier, DocumentTemplate? template = null)
        {
            return "/dummy/path/contract.pdf";
        }

        public string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier, DocumentTemplate? template = null)
        {
            return "/dummy/path/order.pdf";
        }

        public string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception)
        {
            return "/dummy/path/reception.pdf";
        }

        public string GenerateEvaluationAct(PurchaseProcess process, List<Invitation> invitations, User evaluator, string hash, string signature, byte[]? signatureImageBytes)
        {
            return "/dummy/path/evaluation.pdf";
        }

        public string GenerateAuctionClosingAct(Auction auction, string hash, List<AuctionComparisonRow> comparisonRows)
        {
            Hash = hash;
            ComparisonRows = comparisonRows;
            return "/dummy/path/auction-closing.pdf";
        }
    }
}
