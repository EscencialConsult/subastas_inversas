using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record ApprovePurchaseProcessCommand(Guid CompanyId, Guid Id, Guid ApproverId) : IRequest<PurchaseProcessDto?>;

public class ApprovePurchaseProcessCommandHandler : IRequestHandler<ApprovePurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public ApprovePurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(ApprovePurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.PendingApproval &&
            process.Status != PurchaseProcessStatus.Adjudicated)
        {
            throw new InvalidOperationException("Solo se pueden aprobar procesos pendientes de aprobacion.");
        }

        var approver = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.ApproverId && u.Active, cancellationToken);

        if (approver == null || approver.CompanyId != request.CompanyId)
        {
            throw new InvalidOperationException("Aprobador no encontrado para la empresa.");
        }

        ApprovalWorkflowLevel? approvedLevel = null;
        if (process.Status == PurchaseProcessStatus.PendingApproval)
        {
            var workflow = await ApprovalWorkflowRules.FindWorkflowForAmount(
                _context,
                request.CompanyId,
                process.EstimatedBudget,
                cancellationToken);

            if (workflow != null)
            {
                var levels = ApprovalWorkflowRouting.GetRequiredLevels(workflow, process.EstimatedBudget);
                if (levels.Count > 0)
                {
                    var levelIds = levels.Select(l => l.Id).ToList();
                    var approvedLevelIds = await _context.Approvals
                        .Where(a => a.PurchaseProcessId == process.Id &&
                            a.Status == ApprovalStatus.Approved &&
                            a.ApprovalWorkflowLevelId.HasValue &&
                            levelIds.Contains(a.ApprovalWorkflowLevelId.Value))
                        .Select(a => a.ApprovalWorkflowLevelId!.Value)
                        .Distinct()
                        .ToListAsync(cancellationToken);

                    approvedLevel = levels.FirstOrDefault(l => !approvedLevelIds.Contains(l.Id));
                    if (approvedLevel == null)
                    {
                        throw new InvalidOperationException("El circuito ya fue aprobado.");
                    }

                    if (approver.Role != approvedLevel.RequiredRole)
                    {
                        throw new InvalidOperationException($"El nivel {approvedLevel.LevelOrder} requiere rol {approvedLevel.RequiredRole}.");
                    }

                    process.Status = approvedLevelIds.Count + 1 >= levels.Count
                        ? PurchaseProcessStatus.Approved
                        : PurchaseProcessStatus.PendingApproval;
                }
                else
                {
                    process.Status = PurchaseProcessStatus.Approved;
                }
            }
            else
            {
                process.Status = PurchaseProcessStatus.Approved;
            }
        }
        else
        {
            if (approver.Role != UserRole.Autoridad)
            {
                throw new InvalidOperationException("La aprobacion requiere rol Autoridad.");
            }

            process.Status = PurchaseProcessStatus.Approved;
        }

        process.RejectionReason = null;

        var approval = new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.ApproverId,
            ApprovalWorkflowLevelId = approvedLevel?.Id,
            Status = ApprovalStatus.Approved,
            Comments = approvedLevel == null
                ? "Aprobado por autoridad"
                : $"Aprobado nivel {approvedLevel.LevelOrder}",
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Approvals.Add(approval);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
