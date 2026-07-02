using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record ReturnPurchaseProcessCommand(Guid CompanyId, Guid Id, Guid ApproverId, string Motivo) : IRequest<PurchaseProcessDto?>;

public class ReturnPurchaseProcessCommandHandler : IRequestHandler<ReturnPurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public ReturnPurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(ReturnPurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Motivo))
        {
            throw new InvalidOperationException("Debe indicar un motivo para devolver la adjudicacion.");
        }

        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Awards)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Adjudicated)
        {
            throw new InvalidOperationException("Solo se pueden devolver adjudicaciones pendientes de aprobacion.");
        }

        var approver = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.ApproverId && u.Active, cancellationToken);

        if (approver == null || approver.CompanyId != request.CompanyId)
        {
            throw new InvalidOperationException("Aprobador no encontrado para la empresa.");
        }

        var adjudicatedAmount = process.Awards.Sum(award => award.Amount);
        var route = await ApprovalDecisionRouting.ResolveNextLevel(
            _context,
            request.CompanyId,
            process.Id,
            adjudicatedAmount > 0 ? adjudicatedAmount : process.EstimatedBudget,
            cancellationToken);

        var returnedLevel = route.NextLevel;
        if (route.RequiredLevelCount > 0 && returnedLevel == null)
        {
            throw new InvalidOperationException("El circuito ya fue aprobado.");
        }

        ApprovalDecisionRouting.EnsureApproverCanAct(approver, returnedLevel);

        process.Status = PurchaseProcessStatus.Evaluation;
        process.RejectionReason = request.Motivo;

        _context.Approvals.Add(new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.ApproverId,
            ApprovalWorkflowLevelId = returnedLevel?.Id,
            Status = ApprovalStatus.Returned,
            Comments = request.Motivo,
            CreatedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return PurchaseProcessMapping.ToDto(process);
    }
}
