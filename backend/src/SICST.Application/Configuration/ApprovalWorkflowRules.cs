using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration;

public static class ApprovalWorkflowRules
{
    public static List<ApprovalWorkflowLevelInputDto> NormalizeLevels(
        IReadOnlyCollection<ApprovalWorkflowLevelInputDto> levels,
        UserRole fallbackRole,
        int fallbackApprovals,
        decimal? fallbackThreshold)
    {
        if (levels.Count > 0)
        {
            return levels
                .OrderBy(l => l.LevelOrder)
                .Select((level, index) => new ApprovalWorkflowLevelInputDto
                {
                    LevelOrder = level.LevelOrder > 0 ? level.LevelOrder : index + 1,
                    RequiredRole = level.RequiredRole,
                    AmountThreshold = level.AmountThreshold
                })
                .ToList();
        }

        return Enumerable.Range(1, Math.Max(1, fallbackApprovals))
            .Select(order => new ApprovalWorkflowLevelInputDto
            {
                LevelOrder = order,
                RequiredRole = fallbackRole,
                AmountThreshold = fallbackThreshold ?? 0
            })
            .ToList();
    }

    public static void Validate(
        string name,
        decimal? minAmount,
        decimal? maxAmount,
        IReadOnlyCollection<ApprovalWorkflowLevelInputDto> levels)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException("El nombre del circuito es obligatorio.");
        }

        if (minAmount.HasValue && minAmount.Value < 0)
        {
            throw new InvalidOperationException("El monto minimo no puede ser negativo.");
        }

        if (maxAmount.HasValue && maxAmount.Value < 0)
        {
            throw new InvalidOperationException("El monto maximo no puede ser negativo.");
        }

        if (minAmount.HasValue && maxAmount.HasValue && minAmount > maxAmount)
        {
            throw new InvalidOperationException("El monto minimo no puede ser mayor al monto maximo.");
        }

        if (levels.Count == 0)
        {
            throw new InvalidOperationException("El circuito requiere al menos un nivel.");
        }

        if (levels.Any(l => l.LevelOrder < 1))
        {
            throw new InvalidOperationException("El orden de los niveles debe ser mayor a cero.");
        }

        if (levels.Select(l => l.LevelOrder).Distinct().Count() != levels.Count)
        {
            throw new InvalidOperationException("Los niveles no pueden repetir el orden.");
        }

        if (levels.Any(l => l.AmountThreshold < 0))
        {
            throw new InvalidOperationException("El umbral de cada nivel no puede ser negativo.");
        }
    }

    public static async Task EnsureNoOverlap(
        IApplicationDbContext context,
        Guid companyId,
        decimal? minAmount,
        decimal? maxAmount,
        Guid? excludingId,
        CancellationToken cancellationToken)
    {
        var query = context.ApprovalWorkflows.Where(w => w.CompanyId == companyId && w.Active);
        if (excludingId.HasValue)
        {
            query = query.Where(w => w.Id != excludingId.Value);
        }

        var newMin = minAmount ?? 0;
        var newMax = maxAmount ?? decimal.MaxValue;
        var overlaps = await query.AnyAsync(w =>
            newMin <= (w.MaxAmount ?? decimal.MaxValue) &&
            (w.MinAmount ?? 0) <= newMax,
            cancellationToken);

        if (overlaps)
        {
            throw new InvalidOperationException("El rango de monto se superpone con otro circuito activo.");
        }
    }

    public static async Task<ApprovalWorkflow?> FindWorkflowForAmount(
        IApplicationDbContext context,
        Guid companyId,
        decimal amount,
        CancellationToken cancellationToken)
    {
        return await context.ApprovalWorkflows
            .Include(w => w.Levels)
            .Where(w => w.CompanyId == companyId &&
                w.Active &&
                (w.MinAmount == null || w.MinAmount <= amount) &&
                (w.MaxAmount == null || amount <= w.MaxAmount))
            .OrderByDescending(w => w.MinAmount ?? 0)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static ApprovalWorkflowDto ToDto(ApprovalWorkflow entity)
    {
        return new ApprovalWorkflowDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            Name = entity.Name,
            MinAmount = entity.MinAmount,
            MaxAmount = entity.MaxAmount,
            RequiredRole = entity.RequiredRole,
            RequiredApprovals = entity.Levels.Count == 0 ? entity.RequiredApprovals : entity.Levels.Count,
            Active = entity.Active,
            Levels = entity.Levels
                .OrderBy(l => l.LevelOrder)
                .Select(l => new ApprovalWorkflowLevelDto
                {
                    Id = l.Id,
                    LevelOrder = l.LevelOrder,
                    RequiredRole = l.RequiredRole,
                    AmountThreshold = l.AmountThreshold
                })
                .ToList()
        };
    }
}

public class ApprovalWorkflowLevelInputDto
{
    public int LevelOrder { get; set; }
    public UserRole RequiredRole { get; set; } = UserRole.Autoridad;
    public decimal AmountThreshold { get; set; }
}
