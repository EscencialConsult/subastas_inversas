using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
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

    public PlaceBidCommandHandler(IApplicationDbContext context, IAuctionStateCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<BidDto> Handle(PlaceBidCommand request, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .Include(a => a.Participants)
            .Include(a => a.Bids)
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

        var timeRemaining = auction.EndsAtUtc - now;
        if (timeRemaining.TotalMinutes < 3.0)
        {
            auction.EndsAtUtc = now.AddMinutes(3);
        }

        var bid = new Bid
        {
            Id = Guid.NewGuid(),
            AuctionId = auction.Id,
            SupplierId = request.SupplierId,
            Amount = request.Amount,
            PlacedAtUtc = now
        };

        _context.Bids.Add(bid);
        await _context.SaveChangesAsync(cancellationToken);
        await _cache.SetAsync(new AuctionState(auction.Id, request.Amount, auction.EndsAtUtc, true), cancellationToken);

        var supplier = await _context.Suppliers.FirstAsync(s => s.Id == request.SupplierId, cancellationToken);

        return new BidDto
        {
            Id = bid.Id,
            AuctionId = bid.AuctionId,
            SupplierId = bid.SupplierId,
            SupplierName = supplier.BusinessName,
            Amount = bid.Amount,
            PlacedAtUtc = bid.PlacedAtUtc
        };
    }
}
