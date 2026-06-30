using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions.Commands;

public record CloseAuctionCommand(Guid CompanyId, Guid AuctionId) : IRequest<AuctionDto?>;

public class CloseAuctionCommandHandler : IRequestHandler<CloseAuctionCommand, AuctionDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuctionStateCache _cache;
    private readonly IPublicAuctionSnapshotCache? _publicSnapshotCache;
    private readonly IPdfGenerator? _pdfGenerator;

    public CloseAuctionCommandHandler(
        IApplicationDbContext context,
        IAuctionStateCache cache,
        IPublicAuctionSnapshotCache? publicSnapshotCache = null,
        IPdfGenerator? pdfGenerator = null)
    {
        _context = context;
        _cache = cache;
        _publicSnapshotCache = publicSnapshotCache;
        _pdfGenerator = pdfGenerator;
    }

    public async Task<AuctionDto?> Handle(CloseAuctionCommand request, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId && a.CompanyId == request.CompanyId, cancellationToken);

        if (auction == null)
        {
            return null;
        }

        if (auction.Status == AuctionStatus.Closed)
        {
            throw new InvalidOperationException("La subasta ya esta cerrada.");
        }
        if (auction.Status != AuctionStatus.Open)
        {
            throw new InvalidOperationException("Solo se puede cerrar una subasta abierta.");
        }

        auction.Status = AuctionStatus.Closed;
        auction.ClosedAtUtc = DateTime.UtcNow;

        var process = await _context.PurchaseProcesses.FirstAsync(p => p.Id == auction.PurchaseProcessId, cancellationToken);
        process.Status = PurchaseProcessStatus.Evaluation;
        process.ClosedAtUtc = auction.ClosedAtUtc;

        GenerateClosingAct(auction);

        await _context.SaveChangesAsync(cancellationToken);

        var dto = AuctionMapping.ToDto(auction);
        await _cache.SetAsync(new AuctionState(auction.Id, dto.CurrentPrice, auction.EndsAtUtc, false), cancellationToken);
        if (_publicSnapshotCache != null)
        {
            await _publicSnapshotCache.SetAsync(PublicAuctionSnapshotMapping.ToSnapshot(auction), cancellationToken);
        }

        return dto;
    }

    private void GenerateClosingAct(Auction auction)
    {
        var comparisonRows = AuctionClosingAct.BuildComparisonRows(auction);
        var winningAmount = comparisonRows.Count == 0 ? auction.BasePrice : comparisonRows[0].BestAmount;

        auction.SavingsAmount = AuctionClosingAct.CalculateSavingsAmount(auction.BasePrice, winningAmount);
        auction.SavingsPercentage = AuctionClosingAct.CalculateSavingsPercentage(auction.BasePrice, winningAmount);
        auction.ClosingActHash = AuctionClosingAct.ComputeHash(auction, comparisonRows);

        if (_pdfGenerator != null)
        {
            auction.ClosingActPath = _pdfGenerator.GenerateAuctionClosingAct(auction, auction.ClosingActHash, comparisonRows);
        }
    }
}
