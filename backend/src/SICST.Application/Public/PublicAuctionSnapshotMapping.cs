using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public;

public static class PublicAuctionSnapshotMapping
{
    public static PublicAuctionSnapshotDto ToSnapshot(Auction auction)
    {
        var identitiesRevealed = auction.Status == AuctionStatus.Closed;
        var aliases = auction.Participants
            .OrderBy(p => p.JoinedAtUtc)
            .ThenBy(p => p.SupplierId)
            .Select((participant, index) => new
            {
                participant.SupplierId,
                Alias = $"Oferente {index + 1}"
            })
            .ToDictionary(item => item.SupplierId, item => item.Alias);

        var ranking = auction.Bids
            .GroupBy(b => b.SupplierId)
            .Select(group =>
            {
                var bestBid = group.OrderBy(b => b.Amount).ThenBy(b => b.PlacedAtUtc).First();
                var lastBid = group.OrderByDescending(b => b.PlacedAtUtc).First();

                return new
                {
                    SupplierId = group.Key,
                    SupplierName = bestBid.Supplier.BusinessName,
                    Amount = bestBid.Amount,
                    BidCount = group.Count(),
                    LastBidAtUtc = lastBid.PlacedAtUtc
                };
            })
            .OrderBy(item => item.Amount)
            .ThenBy(item => item.LastBidAtUtc)
            .Select((item, index) => new PublicAuctionRankingItemDto
            {
                Position = index + 1,
                SupplierId = identitiesRevealed ? item.SupplierId : Guid.Empty,
                DisplayName = identitiesRevealed
                    ? item.SupplierName
                    : aliases.GetValueOrDefault(item.SupplierId, $"Oferente {index + 1}"),
                Amount = item.Amount,
                BidCount = item.BidCount,
                LastBidAtUtc = item.LastBidAtUtc
            })
            .ToList();

        return new PublicAuctionSnapshotDto
        {
            Id = auction.Id,
            PurchaseProcessId = auction.PurchaseProcessId,
            CompanyId = auction.CompanyId,
            CompanyName = auction.PurchaseProcess.Company.Name,
            ProcessCode = auction.PurchaseProcess.Code,
            ProcessTitle = auction.PurchaseProcess.Title,
            BasePrice = auction.BasePrice,
            CurrentPrice = auction.Bids.Count == 0 ? auction.BasePrice : auction.Bids.Min(b => b.Amount),
            Status = auction.Status,
            StartsAtUtc = auction.StartsAtUtc,
            EndsAtUtc = auction.EndsAtUtc,
            ClosedAtUtc = auction.ClosedAtUtc,
            BidCount = auction.Bids.Count,
            UpdatedAtUtc = DateTime.UtcNow,
            IdentitiesRevealed = identitiesRevealed,
            Ranking = ranking
        };
    }
}
