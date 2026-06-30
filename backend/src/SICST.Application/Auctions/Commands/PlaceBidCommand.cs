using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions.Commands;

public record PlaceBidCommand : IRequest<BidDto>
{
    public Guid AuctionId { get; init; }
    public Guid SupplierId { get; init; }
    public decimal Amount { get; init; }
}

public class PlaceBidCommandHandler : IRequestHandler<PlaceBidCommand, BidDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuctionStateCache _cache;
    private readonly IAuctionBidLock _bidLock;
    private readonly IPublicAuctionSnapshotCache? _publicSnapshotCache;

    public PlaceBidCommandHandler(
        IApplicationDbContext context,
        IAuctionStateCache cache,
        IAuctionBidLock bidLock,
        IPublicAuctionSnapshotCache? publicSnapshotCache = null)
    {
        _context = context;
        _cache = cache;
        _bidLock = bidLock;
        _publicSnapshotCache = publicSnapshotCache;
    }

    public async Task<BidDto> Handle(PlaceBidCommand request, CancellationToken cancellationToken)
    {
        using var bidLock = await _bidLock.AcquireAsync(request.AuctionId, cancellationToken);

        var auction = await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId, cancellationToken);

        if (auction == null)
        {
            throw new InvalidOperationException("Subasta no encontrada.");
        }

        var now = DateTime.UtcNow;
        if (auction.Status != AuctionStatus.Open || now < auction.StartsAtUtc || now > auction.EndsAtUtc)
        {
            throw new InvalidOperationException("La subasta no esta habilitada para recibir ofertas.");
        }

        var participant = auction.Participants.FirstOrDefault(p => p.SupplierId == request.SupplierId && p.Active);
        if (participant == null)
        {
            throw new InvalidOperationException("El proveedor no esta habilitado para esta subasta.");
        }

        var lastBid = auction.Bids.OrderByDescending(b => b.PlacedAtUtc).FirstOrDefault();
        var lastSequencedBid = auction.Bids
            .OrderByDescending(b => b.SequenceNumber)
            .ThenByDescending(b => b.PlacedAtUtc)
            .FirstOrDefault();

        if (lastBid != null && lastBid.SupplierId == request.SupplierId)
        {
            throw new InvalidOperationException("Debe esperar a que otro proveedor oferte antes de hacer un nuevo lance.");
        }

        var currentPrice = auction.Bids.Count == 0 ? auction.BasePrice : auction.Bids.Min(b => b.Amount);
        var minimumAmount = currentPrice * (1 - auction.MinimumDecrementPercentage / 100);

        if (request.Amount >= currentPrice)
        {
            throw new InvalidOperationException("La oferta debe ser menor al precio actual.");
        }

        if (request.Amount > minimumAmount)
        {
            throw new InvalidOperationException("La oferta no respeta el decremento minimo requerido.");
        }

        var originalEndsAt = auction.EndsAtUtc;
        var timeRemaining = originalEndsAt - now;
        if (auction.AutoExtensionMinutes > 0 && timeRemaining.TotalMinutes <= auction.AutoExtensionMinutes)
        {
            auction.EndsAtUtc = now.AddMinutes(auction.AutoExtensionMinutes);
        }
        var auctionExtended = auction.EndsAtUtc > originalEndsAt;

        var sequenceNumber = (lastSequencedBid?.SequenceNumber ?? 0) + 1;
        var previousHash = lastSequencedBid?.Hash ?? string.Empty;
        var bidId = Guid.NewGuid();
        var isPab = auction.PabThreshold > 0 && request.Amount < auction.PabThreshold;
        var bid = new Bid
        {
            Id = bidId,
            AuctionId = auction.Id,
            SupplierId = request.SupplierId,
            Amount = request.Amount,
            PlacedAtUtc = now,
            IsPab = isPab,
            SequenceNumber = sequenceNumber,
            PreviousHash = previousHash
        };
        bid.Hash = ComputeBidHash(bid);

        _context.Bids.Add(bid);
        await _context.SaveChangesAsync(cancellationToken);
        await _cache.SetAsync(new AuctionState(auction.Id, request.Amount, auction.EndsAtUtc, true), cancellationToken);
        if (_publicSnapshotCache != null)
        {
            await _publicSnapshotCache.SetAsync(PublicAuctionSnapshotMapping.ToSnapshot(auction), cancellationToken);
        }

        var supplier = await _context.Suppliers.FirstAsync(s => s.Id == request.SupplierId, cancellationToken);

        return new BidDto
        {
            Id = bid.Id,
            AuctionId = bid.AuctionId,
            SupplierId = bid.SupplierId,
            SupplierName = supplier.BusinessName,
            Amount = bid.Amount,
            PlacedAtUtc = bid.PlacedAtUtc,
            IsPab = bid.IsPab,
            AuctionEndsAtUtc = auction.EndsAtUtc,
            AuctionExtended = auctionExtended,
            SequenceNumber = bid.SequenceNumber,
            PreviousHash = bid.PreviousHash,
            Hash = bid.Hash
        };
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

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
