using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record SaveSupplierEvaluationsCommand(
    Guid CompanyId,
    Guid PurchaseProcessId,
    Guid EvaluatorId,
    List<SaveSupplierEvaluationInputDto> SupplierEvaluations
) : IRequest<EvaluationResultsDto>;

public class SaveSupplierEvaluationsCommandHandler : IRequestHandler<SaveSupplierEvaluationsCommand, EvaluationResultsDto>
{
    private readonly IApplicationDbContext _context;

    public SaveSupplierEvaluationsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EvaluationResultsDto> Handle(SaveSupplierEvaluationsCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
            throw new InvalidOperationException("Proceso de compra no encontrado.");

        if (process.Status != PurchaseProcessStatus.Evaluation)
            throw new InvalidOperationException("Solo se pueden registrar evaluaciones en la etapa de evaluación.");

        var criteria = await _context.EvaluationCriteria
            .Where(c => c.PurchaseProcessId == request.PurchaseProcessId)
            .OrderBy(c => c.SortOrder)
            .ToListAsync(cancellationToken);

        var weightedCriteria = criteria.Where(c => c.Type == CriterionType.Weighted).ToList();
        var totalWeight = weightedCriteria.Sum(c => c.Weight);

        var now = DateTime.UtcNow;

        var existingEvals = await _context.SupplierEvaluations
            .Include(e => e.CriterionResults)
            .Where(e => e.PurchaseProcessId == request.PurchaseProcessId)
            .ToListAsync(cancellationToken);
        _context.SupplierEvaluations.RemoveRange(existingEvals);

        foreach (var input in request.SupplierEvaluations)
        {
            var hasExclusionaryFail = input.Results.Any(r =>
            {
                var criterion = criteria.FirstOrDefault(c => c.Id == r.EvaluationCriterionId);
                return criterion?.Type == CriterionType.Exclusionary && !r.Passed;
            });

            var passedWeightedScore = ComputeWeightedScore(input.Results, criteria, weightedCriteria, totalWeight);

            _context.SupplierEvaluations.Add(new SupplierEvaluation
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = request.PurchaseProcessId,
                SupplierId = input.SupplierId,
                TotalWeightedScore = hasExclusionaryFail ? null : passedWeightedScore,
                IsExcluded = hasExclusionaryFail,
                ExcludedReason = hasExclusionaryFail ? GetExclusionReason(input.Results, criteria) : null,
                EvaluatedById = request.EvaluatorId,
                EvaluatedAtUtc = now,
                CriterionResults = input.Results.Select(r => new SupplierCriterionResult
                {
                    Id = Guid.NewGuid(),
                    EvaluationCriterionId = r.EvaluationCriterionId,
                    Score = criteria.FirstOrDefault(c => c.Id == r.EvaluationCriterionId)?.Type == CriterionType.Weighted ? r.Score : null,
                    Passed = r.Passed,
                    Notes = r.Notes
                }).ToList()
            });
        }

        var bestNonExcluded = request.SupplierEvaluations
            .Where(s => !s.Results.Any(r =>
            {
                var crit = criteria.FirstOrDefault(c => c.Id == r.EvaluationCriterionId);
                return crit?.Type == CriterionType.Exclusionary && !r.Passed;
            }))
            .OrderByDescending(s => ComputeWeightedScore(s.Results, criteria, weightedCriteria, totalWeight))
            .FirstOrDefault();

        if (process.Evaluation == null && bestNonExcluded != null)
        {
            var supplier = await _context.Suppliers
                .FirstOrDefaultAsync(s => s.Id == bestNonExcluded.SupplierId, cancellationToken);

            _context.Evaluations.Add(new Evaluation
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = request.PurchaseProcessId,
                EvaluatorId = request.EvaluatorId,
                RecommendedSupplier = supplier?.BusinessName ?? "",
                Observations = "Evaluación registrada por evaluador con criterios.",
                CreatedAtUtc = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await BuildResults(request.PurchaseProcessId, cancellationToken);
    }

    private static decimal ComputeWeightedScore(
        List<SaveCriterionResultInputDto> results,
        List<EvaluationCriterion> criteria,
        List<EvaluationCriterion> weightedCriteria,
        decimal totalWeight)
    {
        if (weightedCriteria.Count == 0 || totalWeight == 0) return 0;

        var sum = 0m;
        foreach (var r in results)
        {
            var crit = criteria.FirstOrDefault(c => c.Id == r.EvaluationCriterionId);
            if (crit?.Type == CriterionType.Weighted && r.Score.HasValue)
                sum += r.Score.Value * crit.Weight;
        }

        return totalWeight > 0 ? Math.Round(sum / totalWeight, 2) : 0;
    }

    private static string? GetExclusionReason(
        List<SaveCriterionResultInputDto> results,
        List<EvaluationCriterion> criteria)
    {
        var failed = results.FirstOrDefault(r =>
        {
            var crit = criteria.FirstOrDefault(c => c.Id == r.EvaluationCriterionId);
            return crit?.Type == CriterionType.Exclusionary && !r.Passed;
        });

        if (failed == null) return null;
        var name = criteria.FirstOrDefault(c => c.Id == failed.EvaluationCriterionId)?.Name ?? "";
        return $"No cumplió criterio excluyente: {name}";
    }

    private async Task<EvaluationResultsDto> BuildResults(Guid purchaseProcessId, CancellationToken cancellationToken)
    {
        var criteria = await _context.EvaluationCriteria
            .Where(c => c.PurchaseProcessId == purchaseProcessId)
            .OrderBy(c => c.SortOrder)
            .Select(c => new EvaluationCriterionDto
            {
                Id = c.Id,
                PurchaseProcessId = c.PurchaseProcessId,
                Name = c.Name,
                Description = c.Description,
                Type = c.Type.ToString(),
                Weight = c.Weight,
                SortOrder = c.SortOrder,
                CreatedById = c.CreatedById,
                CreatedByName = c.CreatedBy != null ? c.CreatedBy.FirstName + " " + c.CreatedBy.LastName : "",
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);

        var evaluations = await _context.SupplierEvaluations
            .Include(e => e.Supplier)
            .Include(e => e.EvaluatedBy)
            .Include(e => e.CriterionResults).ThenInclude(r => r.EvaluationCriterion)
            .Where(e => e.PurchaseProcessId == purchaseProcessId)
            .OrderByDescending(e => e.IsExcluded)
            .ThenByDescending(e => e.TotalWeightedScore)
            .Select(e => new SupplierEvaluationDto
            {
                Id = e.Id,
                PurchaseProcessId = e.PurchaseProcessId,
                SupplierId = e.SupplierId,
                SupplierName = e.Supplier.BusinessName,
                TotalWeightedScore = e.TotalWeightedScore,
                IsExcluded = e.IsExcluded,
                ExcludedReason = e.ExcludedReason,
                EvaluatedById = e.EvaluatedById,
                EvaluatedByName = e.EvaluatedBy.FirstName + " " + e.EvaluatedBy.LastName,
                EvaluatedAtUtc = e.EvaluatedAtUtc,
                CriterionResults = e.CriterionResults.Select(r => new SupplierCriterionResultDto
                {
                    Id = r.Id,
                    EvaluationCriterionId = r.EvaluationCriterionId,
                    CriterionName = r.EvaluationCriterion.Name,
                    CriterionType = r.EvaluationCriterion.Type.ToString(),
                    Score = r.Score,
                    Passed = r.Passed,
                    Notes = r.Notes
                }).ToList()
            })
            .ToListAsync(cancellationToken);

        return new EvaluationResultsDto
        {
            PurchaseProcessId = purchaseProcessId,
            Criteria = criteria,
            SupplierEvaluations = evaluations
        };
    }
}
