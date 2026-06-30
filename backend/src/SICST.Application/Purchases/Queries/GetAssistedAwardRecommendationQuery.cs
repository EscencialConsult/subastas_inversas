using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Queries;

public record GetAssistedAwardRecommendationQuery(Guid CompanyId, Guid PurchaseProcessId)
    : IRequest<AssistedAwardRecommendationDto?>;

public class GetAssistedAwardRecommendationQueryHandler
    : IRequestHandler<GetAssistedAwardRecommendationQuery, AssistedAwardRecommendationDto?>
{
    private const decimal LowTechnicalScoreThreshold = 60m;

    private readonly IApplicationDbContext _context;

    public GetAssistedAwardRecommendationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AssistedAwardRecommendationDto?> Handle(
        GetAssistedAwardRecommendationQuery request,
        CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        var auction = await _context.Auctions
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);

        if (auction == null)
        {
            return BuildEmpty(process.Id, "No existe una subasta asociada al proceso.");
        }

        var evaluations = await _context.SupplierEvaluations
            .Include(e => e.Supplier)
            .Where(e => e.PurchaseProcessId == request.PurchaseProcessId)
            .ToListAsync(cancellationToken);

        var evaluationBySupplier = evaluations.ToDictionary(e => e.SupplierId);

        var candidates = auction.Bids
            .GroupBy(b => b.SupplierId)
            .Select(group =>
            {
                var bestBid = group.OrderBy(b => b.Amount).ThenBy(b => b.PlacedAtUtc).First();
                evaluationBySupplier.TryGetValue(group.Key, out var evaluation);
                var savingsAmount = AuctionClosingAct.CalculateSavingsAmount(auction.BasePrice, bestBid.Amount);

                return new AssistedAwardCandidateDto
                {
                    SupplierId = group.Key,
                    SupplierName = bestBid.Supplier.BusinessName,
                    Amount = bestBid.Amount,
                    SavingsAmount = savingsAmount,
                    SavingsPercentage = AuctionClosingAct.CalculateSavingsPercentage(auction.BasePrice, bestBid.Amount),
                    TechnicalScore = evaluation?.TotalWeightedScore,
                    IsExcluded = evaluation?.IsExcluded ?? false,
                    ExcludedReason = evaluation?.ExcludedReason,
                    IsPab = bestBid.IsPab,
                    BidCount = group.Count()
                };
            })
            .OrderBy(c => c.Amount)
            .ThenByDescending(c => c.TechnicalScore ?? 0)
            .Select((candidate, index) =>
            {
                candidate.Position = index + 1;
                return candidate;
            })
            .ToList();

        if (candidates.Count == 0)
        {
            return BuildEmpty(process.Id, "No se registraron lances para recomendar ganador.");
        }

        var recommendation = candidates.FirstOrDefault(c => !c.IsExcluded);
        if (recommendation == null)
        {
            return new AssistedAwardRecommendationDto
            {
                PurchaseProcessId = process.Id,
                HasRecommendation = false,
                Summary = "No hay proveedores aptos para recomendar: todos figuran excluidos por evaluación.",
                Candidates = candidates,
                Risks =
                [
                    new AssistedAwardRiskDto
                    {
                        Code = "all_candidates_excluded",
                        Severity = "high",
                        Message = "Todos los oferentes con lance fueron excluidos por la evaluación técnica."
                    }
                ]
            };
        }

        var risks = BuildRisks(candidates, recommendation);

        return new AssistedAwardRecommendationDto
        {
            PurchaseProcessId = process.Id,
            RecommendedSupplierId = recommendation.SupplierId,
            RecommendedSupplierName = recommendation.SupplierName,
            RecommendedAmount = recommendation.Amount,
            SavingsAmount = recommendation.SavingsAmount,
            SavingsPercentage = recommendation.SavingsPercentage,
            TechnicalScore = recommendation.TechnicalScore,
            HasRecommendation = true,
            Summary = $"Se recomienda adjudicar a {recommendation.SupplierName} por ser la mejor oferta apta, con ahorro de {recommendation.SavingsPercentage:0.##}%.",
            Risks = risks,
            Candidates = candidates
        };
    }

    private static AssistedAwardRecommendationDto BuildEmpty(Guid processId, string summary)
    {
        return new AssistedAwardRecommendationDto
        {
            PurchaseProcessId = processId,
            HasRecommendation = false,
            Summary = summary
        };
    }

    private static List<AssistedAwardRiskDto> BuildRisks(
        List<AssistedAwardCandidateDto> candidates,
        AssistedAwardCandidateDto recommendation)
    {
        var risks = new List<AssistedAwardRiskDto>();

        if (recommendation.IsPab)
        {
            risks.Add(new AssistedAwardRiskDto
            {
                Code = "pab",
                Severity = "high",
                Message = "La oferta recomendada fue marcada como Precio Anormalmente Bajo (PAB)."
            });
        }

        if (recommendation.TechnicalScore.HasValue && recommendation.TechnicalScore.Value < LowTechnicalScoreThreshold)
        {
            risks.Add(new AssistedAwardRiskDto
            {
                Code = "low_technical_score",
                Severity = "medium",
                Message = $"El puntaje tecnico del proveedor recomendado es bajo ({recommendation.TechnicalScore:0.##}%)."
            });
        }

        if (!recommendation.TechnicalScore.HasValue)
        {
            risks.Add(new AssistedAwardRiskDto
            {
                Code = "missing_technical_score",
                Severity = "medium",
                Message = "No hay puntaje tecnico registrado para el proveedor recomendado."
            });
        }

        var bestTechnical = candidates
            .Where(c => !c.IsExcluded && c.TechnicalScore.HasValue)
            .OrderByDescending(c => c.TechnicalScore)
            .FirstOrDefault();

        if (bestTechnical != null && bestTechnical.SupplierId != recommendation.SupplierId)
        {
            risks.Add(new AssistedAwardRiskDto
            {
                Code = "economic_vs_technical_gap",
                Severity = "info",
                Message = $"La mejor oferta economica no coincide con el mayor puntaje tecnico ({bestTechnical.SupplierName}, {bestTechnical.TechnicalScore:0.##}%)."
            });
        }

        var excludedWithLowerAmount = candidates
            .FirstOrDefault(c => c.IsExcluded && c.Amount < recommendation.Amount);

        if (excludedWithLowerAmount != null)
        {
            risks.Add(new AssistedAwardRiskDto
            {
                Code = "lower_excluded_offer",
                Severity = "info",
                Message = $"Existe una oferta menor excluida: {excludedWithLowerAmount.SupplierName}. Motivo: {excludedWithLowerAmount.ExcludedReason ?? "sin detalle"}."
            });
        }

        return risks;
    }
}
