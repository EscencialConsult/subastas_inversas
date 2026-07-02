using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Audit.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Audit.Queries;

public record GetRiskAlertsQuery(
    Guid? CompanyId = null,
    Guid? PurchaseProcessId = null,
    string? Severity = null,
    int Limit = 200) : IRequest<List<RiskAlertDto>>;

public class GetRiskAlertsQueryHandler : IRequestHandler<GetRiskAlertsQuery, List<RiskAlertDto>>
{
    private const decimal ConcentrationThreshold = 70m;
    private const decimal MinimumDifferenceThreshold = 1m;

    private readonly IApplicationDbContext _context;

    public GetRiskAlertsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RiskAlertDto>> Handle(GetRiskAlertsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Auctions
            .AsNoTracking()
            .AsSplitQuery()
            .Include(a => a.PurchaseProcess)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .AsQueryable();

        if (request.CompanyId.HasValue)
        {
            query = query.Where(a => a.CompanyId == request.CompanyId.Value);
        }

        if (request.PurchaseProcessId.HasValue)
        {
            query = query.Where(a => a.PurchaseProcessId == request.PurchaseProcessId.Value);
        }

        var auctions = await query
            .OrderByDescending(a => a.ClosedAtUtc ?? a.EndsAtUtc)
            .Take(Paging.NormalizeLimit(request.Limit))
            .ToListAsync(cancellationToken);

        var alerts = auctions
            .SelectMany(BuildAlerts)
            .OrderByDescending(a => SeverityWeight(a.Severity))
            .ThenByDescending(a => a.DetectedAtUtc)
            .ToList();

        if (!string.IsNullOrWhiteSpace(request.Severity))
        {
            alerts = alerts
                .Where(a => string.Equals(a.Severity, request.Severity.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return alerts.Take(Paging.NormalizeLimit(request.Limit)).ToList();
    }

    private static IEnumerable<RiskAlertDto> BuildAlerts(Auction auction)
    {
        var alerts = new List<RiskAlertDto>();
        var bids = auction.Bids
            .OrderBy(b => b.Amount)
            .ThenBy(b => b.PlacedAtUtc)
            .ToList();

        var detectedAt = auction.ClosedAtUtc ?? auction.EndsAtUtc;

        if (bids.Count == 0)
        {
            alerts.Add(CreateAlert(
                auction,
                "no_bids",
                "medium",
                "La subasta no registra lances.",
                0,
                "lances",
                detectedAt));
            return alerts;
        }

        var suppliersWithBids = bids
            .Select(b => b.SupplierId)
            .Distinct()
            .Count();

        if (suppliersWithBids == 1)
        {
            alerts.Add(CreateAlert(
                auction,
                "single_offerer",
                "high",
                "La subasta tuvo un solo oferente con lances registrados.",
                suppliersWithBids,
                "oferentes",
                detectedAt));
        }

        var bidCountBySupplier = bids
            .GroupBy(b => b.SupplierId)
            .Select(g => new
            {
                SupplierName = g.First().Supplier?.BusinessName ?? "Proveedor",
                Count = g.Count()
            })
            .OrderByDescending(g => g.Count)
            .First();
        var concentration = Math.Round((decimal)bidCountBySupplier.Count / bids.Count * 100, 2);

        if (bids.Count >= 3 && concentration >= ConcentrationThreshold)
        {
            alerts.Add(CreateAlert(
                auction,
                "bid_concentration",
                concentration >= 85m ? "high" : "medium",
                $"Concentracion de lances: {bidCountBySupplier.SupplierName} concentra {concentration:0.##}% de los lances.",
                concentration,
                "%",
                detectedAt));
        }

        var bestBySupplier = bids
            .GroupBy(b => b.SupplierId)
            .Select(g => g.OrderBy(b => b.Amount).ThenBy(b => b.PlacedAtUtc).First())
            .OrderBy(b => b.Amount)
            .ThenBy(b => b.PlacedAtUtc)
            .ToList();

        if (bestBySupplier.Count >= 2)
        {
            var best = bestBySupplier[0];
            var second = bestBySupplier[1];
            var differencePercentage = second.Amount == 0
                ? 0
                : Math.Round((second.Amount - best.Amount) / second.Amount * 100, 2);

            if (differencePercentage >= 0 && differencePercentage <= MinimumDifferenceThreshold)
            {
                alerts.Add(CreateAlert(
                    auction,
                    "minimal_difference",
                    "medium",
                    $"Diferencia minima entre las dos mejores ofertas ({differencePercentage:0.##}%).",
                    differencePercentage,
                    "%",
                    detectedAt));
            }
        }

        var pabBids = bids.Where(b => b.IsPab).ToList();
        if (pabBids.Count > 0)
        {
            var winningBid = bids[0];
            var winningBidIsPab = winningBid.IsPab;
            alerts.Add(CreateAlert(
                auction,
                "pab",
                winningBidIsPab ? "high" : "medium",
                winningBidIsPab
                    ? "La mejor oferta fue marcada como Precio Anormalmente Bajo (PAB)."
                    : $"Se detectaron {pabBids.Count} lances marcados como Precio Anormalmente Bajo (PAB).",
                pabBids.Count,
                "lances",
                detectedAt));
        }

        return alerts;
    }

    private static RiskAlertDto CreateAlert(
        Auction auction,
        string code,
        string severity,
        string message,
        decimal? metricValue,
        string metricUnit,
        DateTime detectedAtUtc)
    {
        return new RiskAlertDto
        {
            CompanyId = auction.CompanyId,
            PurchaseProcessId = auction.PurchaseProcessId,
            ProcessCode = auction.PurchaseProcess?.Code ?? string.Empty,
            ProcessTitle = auction.PurchaseProcess?.Title ?? string.Empty,
            AuctionId = auction.Id,
            Code = code,
            Severity = severity,
            Message = message,
            MetricValue = metricValue,
            MetricUnit = metricUnit,
            DetectedAtUtc = detectedAtUtc
        };
    }

    private static int SeverityWeight(string severity)
    {
        return severity.ToLowerInvariant() switch
        {
            "high" => 3,
            "medium" => 2,
            _ => 1
        };
    }
}
