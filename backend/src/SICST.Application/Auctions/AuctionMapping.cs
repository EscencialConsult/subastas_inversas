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
                PlacedAtUtc = b.PlacedAtUtc,
                IsPab = b.IsPab,
                SequenceNumber = b.SequenceNumber,
                PreviousHash = b.PreviousHash,
                Hash = b.Hash
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
            ClosingActHash = auction.ClosingActHash,
            ClosingActUrl = string.IsNullOrWhiteSpace(auction.ClosingActPath)
                ? null
                : $"/api/companies/{auction.CompanyId}/auctions/{auction.Id}/closing-act/pdf",
            SavingsAmount = auction.SavingsAmount,
            SavingsPercentage = auction.SavingsPercentage,
            AutoExtensionMinutes = auction.AutoExtensionMinutes,
            PabThreshold = auction.PabThreshold,
            ParticipantSupplierIds = auction.Participants.Select(p => p.SupplierId).ToList(),
            Bids = bids,
            ComparisonRows = auction.Status == AuctionStatus.Closed
                ? AuctionClosingAct.BuildComparisonRows(auction).Select(row => new AuctionComparisonRowDto
                {
                    Position = row.Position,
                    SupplierId = row.SupplierId,
                    SupplierName = row.SupplierName,
                    BestAmount = row.BestAmount,
                    BidCount = row.BidCount,
                    LastBidAtUtc = row.LastBidAtUtc,
                    SavingsAmount = row.SavingsAmount,
                    SavingsPercentage = row.SavingsPercentage
                }).ToList()
                : []
        };
    }
}
