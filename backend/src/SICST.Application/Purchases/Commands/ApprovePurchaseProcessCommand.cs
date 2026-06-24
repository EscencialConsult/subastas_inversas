using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
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

        process.Status = PurchaseProcessStatus.Approved;
        process.RejectionReason = null; // Clear if previously rejected

        var approval = new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.ApproverId,
            Status = ApprovalStatus.Approved,
            Comments = "Aprobado por autoridad",
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Approvals.Add(approval);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
