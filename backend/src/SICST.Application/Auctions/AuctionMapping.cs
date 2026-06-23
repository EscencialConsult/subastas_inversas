using SICST.Application.Auctions.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions;

public static class AuctionMapping
{
    public static AuctionDto ToDto(Auction auction)
    {
        var bids = auction.Bids
            .OrderBy(b => b.PlacedAtUtc)
            .Select(b => new BidDto
            {
                Id = b.Id,
                AuctionId = b.AuctionId,
                SupplierId = b.SupplierId,
                SupplierName = b.Supplier.BusinessName,
                Amount = b.Amount,
                PlacedAtUtc = b.PlacedAtUtc
            })
            .ToList();

        return new AuctionDto
        {
            Id = auction.Id,
            PurchaseProcessId = auction.PurchaseProcessId,
            CompanyId = auction.CompanyId,
            BasePrice = auction.BasePrice,
            CurrentPrice = bids.Count == 0 ? auction.BasePrice : bids.Min(b => b.Amount),
            MinimumDecrementPercentage = auction.MinimumDecrementPercentage,
            Status = auction.Status,
            StartsAtUtc = auction.StartsAtUtc,
            EndsAtUtc = auction.EndsAtUtc,
            ClosedAtUtc = auction.ClosedAtUtc,
            ParticipantSupplierIds = auction.Participants.Select(p => p.SupplierId).ToList(),
            Bids = bids
        };
    }
}
