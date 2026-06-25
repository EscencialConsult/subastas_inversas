using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration.Commands;

public record UpdateApprovalWorkflowCommand : IRequest<ApprovalWorkflowDto>
{
    public Guid Id { get; init; }
    public Guid CompanyId { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal? MinAmount { get; init; }
    public decimal? MaxAmount { get; init; }
    public UserRole RequiredRole { get; init; } = UserRole.Autoridad;
    public int RequiredApprovals { get; init; } = 1;
    public bool Active { get; init; } = true;
    public List<ApprovalWorkflowLevelInputDto> Levels { get; init; } = [];
}

public class UpdateApprovalWorkflowCommandHandler : IRequestHandler<UpdateApprovalWorkflowCommand, ApprovalWorkflowDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateApprovalWorkflowCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApprovalWorkflowDto> Handle(UpdateApprovalWorkflowCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ApprovalWorkflows
            .Include(w => w.Levels)
            .FirstOrDefaultAsync(w => w.Id == request.Id && w.CompanyId == request.CompanyId, cancellationToken);

        if (entity == null)
        {
            throw new InvalidOperationException("Circuito no encontrado.");
        }

        var levels = ApprovalWorkflowRules.NormalizeLevels(
            request.Levels,
            request.RequiredRole,
            request.RequiredApprovals,
            request.MinAmount);
        ApprovalWorkflowRules.Validate(request.Name, request.MinAmount, request.MaxAmount, levels);

        var nameExists = await _context.ApprovalWorkflows
            .AnyAsync(w =>
                w.CompanyId == request.CompanyId &&
                w.Id != request.Id &&
                w.Name.ToLower() == request.Name.ToLower(),
                cancellationToken);

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
                request.Id,
                cancellationToken);
        }

        entity.Name = request.Name.Trim();
        entity.MinAmount = request.MinAmount;
        entity.MaxAmount = request.MaxAmount;
        entity.RequiredRole = request.RequiredRole;
        entity.RequiredApprovals = levels.Count;
        entity.Active = request.Active;

        _context.ApprovalWorkflowLevels.RemoveRange(entity.Levels);
        entity.Levels = levels.Select(level => new ApprovalWorkflowLevel
        {
            Id = Guid.NewGuid(),
            ApprovalWorkflowId = entity.Id,
            LevelOrder = level.LevelOrder,
            RequiredRole = level.RequiredRole,
            AmountThreshold = level.AmountThreshold,
            CreatedAtUtc = DateTime.UtcNow
        }).ToList();

        await _context.SaveChangesAsync(cancellationToken);
        return ApprovalWorkflowRules.ToDto(entity);
    }
}
