using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration.Commands;

public record CreateApprovalWorkflowCommand : IRequest<ApprovalWorkflowDto>
{
    public Guid CompanyId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public UserRole RequiredRole { get; init; } = UserRole.Autoridad;
    public int RequiredApprovals { get; init; } = 1;
    public bool Active { get; init; } = true;
}

public class CreateApprovalWorkflowCommandHandler : IRequestHandler<CreateApprovalWorkflowCommand, ApprovalWorkflowDto>
{
    private readonly IApplicationDbContext _context;

    public CreateApprovalWorkflowCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApprovalWorkflowDto> Handle(CreateApprovalWorkflowCommand request, CancellationToken cancellationToken)
    {
        await EnsureCompanyExists(request.CompanyId, cancellationToken);
        Validate(request);

        var nameExists = await _context.ApprovalWorkflows
            .AnyAsync(w => w.CompanyId == request.CompanyId && w.Name.ToLower() == request.Name.ToLower(), cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe un circuito con ese nombre.");
        }

        var entity = new ApprovalWorkflow
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Name = request.Name.Trim(),
            MinAmount = request.MinAmount,
            MaxAmount = request.MaxAmount,
            RequiredRole = request.RequiredRole,
            RequiredApprovals = request.RequiredApprovals,
            Active = request.Active,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ApprovalWorkflows.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(entity);
    }

    private async Task EnsureCompanyExists(Guid companyId, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == companyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }
    }

    private static void Validate(CreateApprovalWorkflowCommand request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new InvalidOperationException("El nombre del circuito es obligatorio.");
        }

        if (request.RequiredApprovals < 1)
        {
            throw new InvalidOperationException("El circuito requiere al menos una aprobacion.");
        }

        if (request.MinAmount.HasValue && request.MaxAmount.HasValue && request.MinAmount > request.MaxAmount)
        {
            throw new InvalidOperationException("El monto minimo no puede ser mayor al monto maximo.");
        }
    }

    private static ApprovalWorkflowDto ToDto(ApprovalWorkflow entity)
    {
        return new ApprovalWorkflowDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            Name = entity.Name,
            MinAmount = entity.MinAmount,
            MaxAmount = entity.MaxAmount,
            RequiredRole = entity.RequiredRole,
            RequiredApprovals = entity.RequiredApprovals,
            Active = entity.Active
        };
    }
}
