using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration.Commands;

public record CreateContractingModeCommand : IRequest<ContractingModeDto>
{
    public Guid CompanyId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public bool RequiresAuction { get; init; } = true;
    public bool Active { get; init; } = true;
}

public class CreateContractingModeCommandHandler : IRequestHandler<CreateContractingModeCommand, ContractingModeDto>
{
    private readonly IApplicationDbContext _context;

    public CreateContractingModeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractingModeDto> Handle(CreateContractingModeCommand request, CancellationToken cancellationToken)
    {
        await EnsureCompanyExists(request.CompanyId, cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("El nombre de la modalidad es obligatorio.");
        }

        ContractingModeRules.ValidateRange(request.MinAmount, request.MaxAmount);
        await ContractingModeRules.EnsureNoOverlap(
            _context,
            request.CompanyId,
            request.MinAmount,
            request.MaxAmount,
            null,
            cancellationToken);

        var nameExists = await _context.ContractingModes
            .AnyAsync(m => m.CompanyId == request.CompanyId && m.Name.ToLower() == request.Name.ToLower(), cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe una modalidad con ese nombre.");
        }

        var entity = new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            MinAmount = request.MinAmount,
            MaxAmount = request.MaxAmount,
            RequiresAuction = request.RequiresAuction,
            Active = request.Active,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ContractingModes.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return ContractingModeRules.ToDto(entity);
    }

    private async Task EnsureCompanyExists(Guid companyId, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == companyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }
    }

}
