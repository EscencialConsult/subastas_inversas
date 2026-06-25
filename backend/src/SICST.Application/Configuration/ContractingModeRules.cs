using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration;

public static class ContractingModeRules
{
    public static void ValidateRange(decimal minAmount, decimal? maxAmount)
    {
        if (minAmount < 0)
        {
            throw new InvalidOperationException("El monto minimo no puede ser negativo.");
        }

        if (maxAmount.HasValue && maxAmount.Value < minAmount)
        {
            throw new InvalidOperationException("El monto maximo no puede ser menor al minimo.");
        }
    }

    public static async Task EnsureNoOverlap(
        IApplicationDbContext context,
        Guid companyId,
        decimal minAmount,
        decimal? maxAmount,
        Guid? excludingId,
        CancellationToken cancellationToken)
    {
        var query = context.ContractingModes
            .Where(m => m.CompanyId == companyId && m.Active);

        if (excludingId.HasValue)
        {
            query = query.Where(m => m.Id != excludingId.Value);
        }

        var newMax = maxAmount ?? decimal.MaxValue;
        var overlaps = await query.AnyAsync(m =>
            minAmount <= (m.MaxAmount ?? decimal.MaxValue) &&
            m.MinAmount <= newMax,
            cancellationToken);

        if (overlaps)
        {
            throw new InvalidOperationException("El rango de monto se superpone con otra modalidad activa.");
        }
    }

    public static async Task<ContractingMode?> FindSuggestedMode(
        IApplicationDbContext context,
        Guid companyId,
        decimal amount,
        CancellationToken cancellationToken)
    {
        return await context.ContractingModes
            .Where(m => m.CompanyId == companyId &&
                m.Active &&
                m.MinAmount <= amount &&
                (m.MaxAmount == null || amount <= m.MaxAmount))
            .OrderByDescending(m => m.MinAmount)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public static ContractingModeDto ToDto(ContractingMode entity)
    {
        return new ContractingModeDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            Name = entity.Name,
            Description = entity.Description,
            MinAmount = entity.MinAmount,
            MaxAmount = entity.MaxAmount,
            RequiresAuction = entity.RequiresAuction,
            Active = entity.Active
        };
    }
}
