using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Configuration.Commands;

public record DeleteApprovalWorkflowCommand(Guid CompanyId, Guid Id) : IRequest;

public class DeleteApprovalWorkflowCommandHandler : IRequestHandler<DeleteApprovalWorkflowCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteApprovalWorkflowCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteApprovalWorkflowCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ApprovalWorkflows
            .FirstOrDefaultAsync(w => w.Id == request.Id && w.CompanyId == request.CompanyId, cancellationToken);

        if (entity == null)
        {
            throw new InvalidOperationException("Circuito no encontrado.");
        }

        var hasApprovals = await _context.Approvals
            .AnyAsync(a => a.ApprovalWorkflowLevel != null &&
                a.ApprovalWorkflowLevel.ApprovalWorkflowId == request.Id,
                cancellationToken);

        if (hasApprovals)
        {
            entity.Active = false;
        }
        else
        {
            _context.ApprovalWorkflows.Remove(entity);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
