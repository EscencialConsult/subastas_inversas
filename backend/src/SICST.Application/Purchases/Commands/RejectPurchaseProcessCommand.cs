using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
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
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.PendingApproval)
        {
            throw new InvalidOperationException("Solo se pueden rechazar procesos pendientes de aprobación.");
        }

        process.Status = PurchaseProcessStatus.Rejected;
        process.RejectionReason = request.Motivo;

        var approval = new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.ApproverId,
            Status = ApprovalStatus.Rejected,
            Comments = request.Motivo,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Approvals.Add(approval);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
