using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration;
using SICST.Application.Modules.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Configuration.Commands;

public record CreateApprovalWorkflowCommand : IRequest<ApprovalWorkflowDto>
{
    public Guid CompanyId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public UserRole RequiredRole { get; init; } = UserRole.Autoridad;
    public int RequiredApprovals { get; init; } = 1;
    public bool Active { get; init; } = true;
    public List<ApprovalWorkflowLevelInputDto> Levels { get; init; } = [];
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
        var levels = ApprovalWorkflowRules.NormalizeLevels(
            request.Levels,
            request.RequiredRole,
            request.RequiredApprovals,
            request.MinAmount);
        ApprovalWorkflowRules.Validate(request.Name, request.MinAmount, request.MaxAmount, levels);

        var nameExists = await _context.ApprovalWorkflows
            .AnyAsync(w => w.CompanyId == request.CompanyId && w.Name.ToLower() == request.Name.ToLower(), cancellationToken);

        if (nameExists)
        {
            throw new InvalidOperationException("Ya existe un circuito con ese nombre.");
        }

        if (request.Active)
        {
            await ApprovalWorkflowRules.EnsureNoOverlap(
                _context,
                request.CompanyId,
                request.MinAmount,
                request.MaxAmount,
                null,
                cancellationToken);
        }

        var entity = new ApprovalWorkflow
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Name = request.Name.Trim(),
            MinAmount = request.MinAmount,
            MaxAmount = request.MaxAmount,
            RequiredRole = request.RequiredRole,
            RequiredApprovals = levels.Count,
            Active = request.Active,
            CreatedAtUtc = DateTime.UtcNow,
            Levels = levels.Select(level => new ApprovalWorkflowLevel
            {
                Id = Guid.NewGuid(),
                LevelOrder = level.LevelOrder,
                RequiredRole = level.RequiredRole,
                AmountThreshold = level.AmountThreshold,
                CreatedAtUtc = DateTime.UtcNow
            }).ToList()
        };

        _context.ApprovalWorkflows.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return ApprovalWorkflowRules.ToDto(entity);
    }

    private async Task EnsureCompanyExists(Guid companyId, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == companyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }
    }

}
