using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;

namespace SICST.Application.Purchases.Queries;

public record GetEvaluationResultsQuery(
    Guid CompanyId,
    Guid PurchaseProcessId
) : IRequest<EvaluationResultsDto?>;

public class GetEvaluationResultsQueryHandler : IRequestHandler<GetEvaluationResultsQuery, EvaluationResultsDto?>
{
    private readonly IApplicationDbContext _context;

    public GetEvaluationResultsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EvaluationResultsDto?> Handle(GetEvaluationResultsQuery request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null) return null;

        var hasEvaluations = await _context.SupplierEvaluations
            .AnyAsync(e => e.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);

        if (!hasEvaluations) return null;

        var criteria = await _context.EvaluationCriteria
            .Where(c => c.PurchaseProcessId == request.PurchaseProcessId)
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
            .Where(e => e.PurchaseProcessId == request.PurchaseProcessId)
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
            PurchaseProcessId = request.PurchaseProcessId,
            Criteria = criteria,
            SupplierEvaluations = evaluations
        };
    }
}
