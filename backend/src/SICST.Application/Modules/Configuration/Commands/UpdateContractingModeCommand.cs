using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration.DTOs;

namespace SICST.Application.Modules.Configuration.Commands;

public record UpdateContractingModeCommand : IRequest<ContractingModeDto>
{
    public Guid CompanyId { get; init; }
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public bool RequiresAuction { get; init; } = true;
    public bool Active { get; init; } = true;
}

public class UpdateContractingModeCommandHandler : IRequestHandler<UpdateContractingModeCommand, ContractingModeDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateContractingModeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractingModeDto> Handle(UpdateContractingModeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ContractingModes
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.CompanyId == request.CompanyId, cancellationToken);

        if (entity == null)
        {
            throw new InvalidOperationException("Modalidad no encontrada.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("El nombre de la modalidad es obligatorio.");
        }

        ContractingModeRules.ValidateRange(request.MinAmount, request.MaxAmount);

        if (request.Active)
        {
            await ContractingModeRules.EnsureNoOverlap(
                _context,
                request.CompanyId,
                request.MinAmount,
                request.MaxAmount,
                request.Id,
                cancellationToken);
        }

        var nameExists = await _context.ContractingModes
            .AnyAsync(m =>
                m.CompanyId == request.CompanyId &&
                m.Id != request.Id &&
                m.Name.ToLower() == request.Name.Trim().ToLower(),
                cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe una modalidad con ese nombre.");
        }

        entity.Name = request.Name.Trim();
        entity.Description = request.Description.Trim();
        entity.MinAmount = request.MinAmount;
        entity.MaxAmount = request.MaxAmount;
        entity.RequiresAuction = request.RequiresAuction;
        entity.Active = request.Active;

        await _context.SaveChangesAsync(cancellationToken);
        return ContractingModeRules.ToDto(entity);
    }
}
