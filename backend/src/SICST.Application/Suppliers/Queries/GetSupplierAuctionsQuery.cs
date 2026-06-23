using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetSupplierAuctionsQuery(Guid SupplierId) : IRequest<List<SupplierAuctionDto>>;

public class GetSupplierAuctionsQueryHandler : IRequestHandler<GetSupplierAuctionsQuery, List<SupplierAuctionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierAuctionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierAuctionDto>> Handle(GetSupplierAuctionsQuery request, CancellationToken cancellationToken)
    {
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (!supplierExists)
            throw new InvalidOperationException("Proveedor no encontrado.");

        var participantAuctionIds = await _context.AuctionParticipants
            .Where(ap => ap.SupplierId == request.SupplierId)
            .Select(ap => ap.AuctionId)
            .ToListAsync(cancellationToken);

        var auctions = await _context.Auctions
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Include(a => a.PurchaseProcess)
            .Where(a => participantAuctionIds.Contains(a.Id))
            .OrderByDescending(a => a.StartsAtUtc)
            .ToListAsync(cancellationToken);

        return auctions.Select(Map).ToList();
    }

    private static SupplierAuctionDto Map(Domain.Entities.Auction auction)
    {
        var bids = auction.Bids
            .OrderBy(b => b.PlacedAtUtc)
            .Select(b => new Auctions.DTOs.BidDto
            {
                Id = b.Id,
                AuctionId = b.AuctionId,
                SupplierId = b.SupplierId,
                SupplierName = b.Supplier.BusinessName,
                Amount = b.Amount,
                PlacedAtUtc = b.PlacedAtUtc
            })
            .ToList();

        return new SupplierAuctionDto
        {
            AuctionId = auction.Id,
            PurchaseProcessId = auction.PurchaseProcessId,
            CompanyId = auction.CompanyId,
            ProcessCode = auction.PurchaseProcess.Code,
            ProcessTitle = auction.PurchaseProcess.Title,
            BasePrice = auction.BasePrice,
            CurrentPrice = bids.Count == 0 ? auction.BasePrice : bids.Min(b => b.Amount),
            MinimumDecrementPercentage = auction.MinimumDecrementPercentage,
            Status = auction.Status.ToString(),
            StartsAtUtc = auction.StartsAtUtc,
            EndsAtUtc = auction.EndsAtUtc,
            ClosedAtUtc = auction.ClosedAtUtc,
            ParticipantSupplierIds = auction.Participants.Select(p => p.SupplierId).ToList(),
            Bids = bids
        };
    }
}
