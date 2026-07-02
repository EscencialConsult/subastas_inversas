using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;

namespace SICST.Application.Modules.Purchases.Queries;

public record GetEvaluationCriteriaQuery(
    Guid CompanyId,
    Guid PurchaseProcessId
) : IRequest<List<EvaluationCriterionDto>>;

public class GetEvaluationCriteriaQueryHandler : IRequestHandler<GetEvaluationCriteriaQuery, List<EvaluationCriterionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEvaluationCriteriaQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<EvaluationCriterionDto>> Handle(GetEvaluationCriteriaQuery request, CancellationToken cancellationToken)
    {
        return await _context.EvaluationCriteria
            .Include(c => c.CreatedBy)
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
                CreatedByName = c.CreatedBy.FirstName + " " + c.CreatedBy.LastName,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.UpdatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
