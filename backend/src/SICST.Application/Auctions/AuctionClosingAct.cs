using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions;

public class AuctionComparisonRow
{
    public int Position { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal BestAmount { get; set; }
    public int BidCount { get; set; }
    public DateTime LastBidAtUtc { get; set; }
    public decimal SavingsAmount { get; set; }
    public decimal SavingsPercentage { get; set; }
}

public static class AuctionClosingAct
{
    public static List<AuctionComparisonRow> BuildComparisonRows(Auction auction)
    {
        return auction.Bids
            .GroupBy(b => b.SupplierId)
            .Select(group =>
            {
                var bestBid = group.OrderBy(b => b.Amount).ThenBy(b => b.PlacedAtUtc).First();
                var lastBid = group.OrderByDescending(b => b.PlacedAtUtc).First();

                return new AuctionComparisonRow
                {
                    SupplierId = group.Key,
                    SupplierName = bestBid.Supplier.BusinessName,
                    BestAmount = bestBid.Amount,
                    BidCount = group.Count(),
                    LastBidAtUtc = lastBid.PlacedAtUtc,
                    SavingsAmount = CalculateSavingsAmount(auction.BasePrice, bestBid.Amount),
                    SavingsPercentage = CalculateSavingsPercentage(auction.BasePrice, bestBid.Amount)
                };
            })
            .OrderBy(row => row.BestAmount)
            .ThenBy(row => row.LastBidAtUtc)
            .Select((row, index) =>
            {
                row.Position = index + 1;
                return row;
            })
            .ToList();
    }

    public static decimal CalculateSavingsAmount(decimal basePrice, decimal currentPrice)
    {
        return Math.Max(0, basePrice - currentPrice);
    }

    public static decimal CalculateSavingsPercentage(decimal basePrice, decimal currentPrice)
    {
        if (basePrice <= 0)
        {
            return 0;
        }

        return Math.Round(CalculateSavingsAmount(basePrice, currentPrice) / basePrice * 100, 2);
    }

    public static string ComputeHash(Auction auction, IReadOnlyCollection<AuctionComparisonRow> comparisonRows)
    {
        var material = new StringBuilder();
        material.Append("AuctionClosingAct").Append("|")
            .Append(auction.Id).Append("|")
            .Append(auction.PurchaseProcessId).Append("|")
            .Append(auction.PurchaseProcess.Code).Append("|")
            .Append(auction.BasePrice.ToString("0.00", CultureInfo.InvariantCulture)).Append("|")
            .Append(auction.ClosedAtUtc?.ToString("O", CultureInfo.InvariantCulture) ?? string.Empty).Append("|")
            .Append(auction.SavingsAmount.ToString("0.00", CultureInfo.InvariantCulture)).Append("|")
            .Append(auction.SavingsPercentage.ToString("0.00", CultureInfo.InvariantCulture)).Append("|");

        foreach (var row in comparisonRows.OrderBy(r => r.Position))
        {
            material.Append(row.Position).Append(",")
                .Append(row.SupplierId).Append(",")
                .Append(row.BestAmount.ToString("0.00", CultureInfo.InvariantCulture)).Append(",")
                .Append(row.BidCount).Append(",")
                .Append(row.LastBidAtUtc.ToString("O", CultureInfo.InvariantCulture)).Append(";");
        }

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(material.ToString()));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
