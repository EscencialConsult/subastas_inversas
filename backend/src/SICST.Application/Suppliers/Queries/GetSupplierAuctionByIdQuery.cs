using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetSupplierAuctionByIdQuery(Guid SupplierId, Guid AuctionId) : IRequest<SupplierAuctionDto?>;

public class GetSupplierAuctionByIdQueryHandler : IRequestHandler<GetSupplierAuctionByIdQuery, SupplierAuctionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierAuctionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierAuctionDto?> Handle(GetSupplierAuctionByIdQuery request, CancellationToken cancellationToken)
    {
        var isParticipant = await _context.AuctionParticipants
            .AnyAsync(ap => ap.SupplierId == request.SupplierId && ap.AuctionId == request.AuctionId, cancellationToken);

        if (!isParticipant)
            return null;

        var auction = await _context.Auctions
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Include(a => a.PurchaseProcess)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId, cancellationToken);

        if (auction == null)
            return null;

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
