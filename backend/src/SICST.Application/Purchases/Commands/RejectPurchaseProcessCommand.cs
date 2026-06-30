using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record RejectPurchaseProcessCommand(Guid CompanyId, Guid Id, Guid ApproverId, string Motivo) : IRequest<PurchaseProcessDto?>;

public class RejectPurchaseProcessCommandHandler : IRequestHandler<RejectPurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public RejectPurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(RejectPurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Awards)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.PendingApproval &&
            process.Status != PurchaseProcessStatus.Approved &&
            process.Status != PurchaseProcessStatus.Adjudicated)
        {
            throw new InvalidOperationException("Solo se pueden rechazar procesos pendientes de aprobacion.");
        }

        ApprovalWorkflowLevel? rejectedLevel = null;
        if (process.Status == PurchaseProcessStatus.Adjudicated)
        {
            var approver = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.ApproverId && u.Active, cancellationToken);

            if (approver == null || approver.CompanyId != request.CompanyId)
            {
                throw new InvalidOperationException("Aprobador no encontrado para la empresa.");
            }

            var amount = process.Awards.Sum(award => award.Amount);
            var route = await ApprovalDecisionRouting.ResolveNextLevel(
                _context,
                request.CompanyId,
                process.Id,
                amount > 0 ? amount : process.EstimatedBudget,
                cancellationToken);

            rejectedLevel = route.NextLevel;
            if (route.RequiredLevelCount > 0 && rejectedLevel == null)
            {
                throw new InvalidOperationException("El circuito ya fue aprobado.");
            }

            ApprovalDecisionRouting.EnsureApproverCanAct(approver, rejectedLevel);
        }

        process.Status = process.Status == PurchaseProcessStatus.Adjudicated
            ? PurchaseProcessStatus.Evaluation
            : PurchaseProcessStatus.Rejected;
        process.RejectionReason = request.Motivo;

        var approval = new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.ApproverId,
            ApprovalWorkflowLevelId = rejectedLevel?.Id,
            Status = ApprovalStatus.Rejected,
            Comments = request.Motivo,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Approvals.Add(approval);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
