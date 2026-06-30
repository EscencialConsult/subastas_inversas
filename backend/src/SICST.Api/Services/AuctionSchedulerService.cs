using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using SICST.Api.Hubs;
using SICST.Application.Auctions;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public;
using SICST.Domain.Entities;

namespace SICST.Api.Services;

public class AuctionSchedulerService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<AuctionHub> _hubContext;
    private readonly ILogger<AuctionSchedulerService> _logger;

    public AuctionSchedulerService(
        IServiceScopeFactory scopeFactory,
        IHubContext<AuctionHub> hubContext,
        ILogger<AuctionSchedulerService> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnce(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while running auction scheduler.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    public async Task RunOnce(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var cache = scope.ServiceProvider.GetRequiredService<IAuctionStateCache>();
        var publicSnapshotCache = scope.ServiceProvider.GetRequiredService<IPublicAuctionSnapshotCache>();
        var pdfGenerator = scope.ServiceProvider.GetRequiredService<IPdfGenerator>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var now = DateTime.UtcNow;

        var auctionsToOpen = await context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Buyer)
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants)
                .ThenInclude(p => p.Supplier)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Where(a => a.Status == AuctionStatus.Scheduled && a.StartsAtUtc <= now)
            .ToListAsync(cancellationToken);

        foreach (var auction in auctionsToOpen)
        {
            auction.Status = AuctionStatus.Open;

            var process = await context.PurchaseProcesses
                .FirstOrDefaultAsync(p => p.Id == auction.PurchaseProcessId, cancellationToken);
            if (process != null)
            {
                process.Status = PurchaseProcessStatus.InAuction;
            }
        }

        if (auctionsToOpen.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);

            foreach (var auction in auctionsToOpen)
            {
                var dto = AuctionMapping.ToDto(auction);
                await cache.SetAsync(new AuctionState(auction.Id, dto.CurrentPrice, auction.EndsAtUtc, true), cancellationToken);
                await publicSnapshotCache.SetAsync(PublicAuctionSnapshotMapping.ToSnapshot(auction), cancellationToken);
                await NotifyAuctionOpened(dto, cancellationToken);
                await NotifyAuctionOpenedByEmail(emailSender, auction, cancellationToken);
            }
        }

        now = DateTime.UtcNow;
        var auctionsToClose = await context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Buyer)
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants)
                .ThenInclude(p => p.Supplier)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Where(a => a.Status == AuctionStatus.Open && a.EndsAtUtc <= now)
            .ToListAsync(cancellationToken);

        foreach (var auction in auctionsToClose)
        {
            auction.Status = AuctionStatus.Closed;
            auction.ClosedAtUtc = now;

            var process = await context.PurchaseProcesses
                .FirstOrDefaultAsync(p => p.Id == auction.PurchaseProcessId, cancellationToken);
            if (process != null)
            {
                process.Status = PurchaseProcessStatus.Evaluation;
                process.ClosedAtUtc = auction.ClosedAtUtc;
            }

            GenerateClosingAct(auction, pdfGenerator);
        }

        if (auctionsToClose.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);

            foreach (var auction in auctionsToClose)
            {
                var dto = AuctionMapping.ToDto(auction);
                await cache.SetAsync(new AuctionState(auction.Id, dto.CurrentPrice, auction.EndsAtUtc, false), cancellationToken);
                await publicSnapshotCache.SetAsync(PublicAuctionSnapshotMapping.ToSnapshot(auction), cancellationToken);
                await NotifyAuctionClosed(dto, cancellationToken);
                await NotifyAuctionClosedByEmail(emailSender, auction, cancellationToken);
            }
        }
    }

    private async Task NotifyAuctionOpened(AuctionDto auction, CancellationToken cancellationToken)
    {
        var group = AuctionHub.GroupName(auction.Id);
        await _hubContext.Clients.Group(group).SendAsync("AuctionOpened", auction, cancellationToken);
        await _hubContext.Clients.Group(group).SendAsync("AuctionUpdated", auction, cancellationToken);
    }

    private async Task NotifyAuctionClosed(AuctionDto auction, CancellationToken cancellationToken)
    {
        var group = AuctionHub.GroupName(auction.Id);
        await _hubContext.Clients.Group(group).SendAsync("AuctionClosed", auction, cancellationToken);
        await _hubContext.Clients.Group(group).SendAsync("AuctionUpdated", auction, cancellationToken);
    }

    private static async Task NotifyAuctionOpenedByEmail(
        IEmailSender emailSender,
        Auction auction,
        CancellationToken cancellationToken)
    {
        foreach (var recipient in GetNotificationRecipients(auction))
        {
            await emailSender.SendAsync(
                recipient,
                $"Subasta abierta: {auction.PurchaseProcess.Code}",
                BuildAuctionOpenedEmail(auction),
                cancellationToken);
        }
    }

    private static async Task NotifyAuctionClosedByEmail(
        IEmailSender emailSender,
        Auction auction,
        CancellationToken cancellationToken)
    {
        foreach (var recipient in GetNotificationRecipients(auction))
        {
            await emailSender.SendAsync(
                recipient,
                $"Subasta cerrada: {auction.PurchaseProcess.Code}",
                BuildAuctionClosedEmail(auction),
                cancellationToken);
        }
    }

    private static IReadOnlyList<string> GetNotificationRecipients(Auction auction)
    {
        return auction.Participants
            .Select(p => p.Supplier.Email)
            .Append(auction.PurchaseProcess.Buyer.Email)
            .Where(email => !string.IsNullOrWhiteSpace(email))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string BuildAuctionOpenedEmail(Auction auction)
    {
        return $"""
            La subasta del proceso {auction.PurchaseProcess.Code} - {auction.PurchaseProcess.Title} ya esta abierta.

            Inicio: {auction.StartsAtUtc:O}
            Cierre previsto: {auction.EndsAtUtc:O}
            Precio base: {auction.BasePrice}
            """;
    }

    private static string BuildAuctionClosedEmail(Auction auction)
    {
        return $"""
            La subasta del proceso {auction.PurchaseProcess.Code} - {auction.PurchaseProcess.Title} fue cerrada automaticamente.

            Cierre: {auction.ClosedAtUtc:O}
            Ofertas recibidas: {auction.Bids.Count}
            """;
    }

    private static void GenerateClosingAct(Auction auction, IPdfGenerator pdfGenerator)
    {
        var comparisonRows = AuctionClosingAct.BuildComparisonRows(auction);
        var winningAmount = comparisonRows.Count == 0 ? auction.BasePrice : comparisonRows[0].BestAmount;

        auction.SavingsAmount = AuctionClosingAct.CalculateSavingsAmount(auction.BasePrice, winningAmount);
        auction.SavingsPercentage = AuctionClosingAct.CalculateSavingsPercentage(auction.BasePrice, winningAmount);
        auction.ClosingActHash = AuctionClosingAct.ComputeHash(auction, comparisonRows);
        auction.ClosingActPath = pdfGenerator.GenerateAuctionClosingAct(auction, auction.ClosingActHash, comparisonRows);
    }
}
