using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record SaveEvaluationCriteriaCommand(
    Guid CompanyId,
    Guid PurchaseProcessId,
    Guid UserId,
    List<SaveEvaluationCriteriaItemDto> Criteria
) : IRequest<List<EvaluationCriterionDto>>;

public class SaveEvaluationCriteriaCommandHandler : IRequestHandler<SaveEvaluationCriteriaCommand, List<EvaluationCriterionDto>>
{
    private readonly IApplicationDbContext _context;

    public SaveEvaluationCriteriaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<EvaluationCriterionDto>> Handle(SaveEvaluationCriteriaCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
            throw new InvalidOperationException("Proceso de compra no encontrado.");

        var existing = await _context.EvaluationCriteria
            .Where(c => c.PurchaseProcessId == request.PurchaseProcessId)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var incomingIds = request.Criteria
            .Where(c => c.Id.HasValue)
            .Select(c => c.Id!.Value)
            .ToHashSet();

        var toDelete = existing.Where(c => !incomingIds.Contains(c.Id)).ToList();
        _context.EvaluationCriteria.RemoveRange(toDelete);

        var userId = request.UserId;

        foreach (var item in request.Criteria)
        {
            if (item.Id.HasValue)
            {
                var existingCriterion = existing.FirstOrDefault(c => c.Id == item.Id.Value);
                if (existingCriterion != null)
                {
                    existingCriterion.Name = item.Name;
                    existingCriterion.Description = item.Description;
                    existingCriterion.Type = Enum.Parse<CriterionType>(item.Type);
                    existingCriterion.Weight = item.Weight;
                    existingCriterion.SortOrder = item.SortOrder;
                    existingCriterion.UpdatedAtUtc = now;
                }
            }
            else
            {
                _context.EvaluationCriteria.Add(new EvaluationCriterion
                {
                    Id = Guid.NewGuid(),
                    PurchaseProcessId = request.PurchaseProcessId,
                    Name = item.Name,
                    Description = item.Description,
                    Type = Enum.Parse<CriterionType>(item.Type),
                    Weight = item.Weight,
                    SortOrder = item.SortOrder,
                    CreatedById = userId,
                    CreatedAtUtc = now
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return await _context.EvaluationCriteria
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
    }
}
