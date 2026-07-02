using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record QualifySupplierCommand : IRequest<QualificationSupplierDto>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public Guid InvitationId { get; init; }
    public Guid EvaluatorId { get; init; }
    public QualificationStatus QualificationStatus { get; init; }
    public string? Notes { get; init; }
}

public class QualifySupplierCommandHandler : IRequestHandler<QualifySupplierCommand, QualificationSupplierDto>
{
    private readonly IApplicationDbContext _context;

    public QualifySupplierCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QualificationSupplierDto> Handle(QualifySupplierCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
            throw new InvalidOperationException("Proceso de compra no encontrado.");

        var invitation = await _context.Invitations
            .Include(i => i.Supplier)
            .Include(i => i.QualifiedBy)
            .FirstOrDefaultAsync(i => i.Id == request.InvitationId && i.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);

        if (invitation == null)
            throw new InvalidOperationException("Invitación no encontrada.");

        if (invitation.Status != InvitationStatus.Accepted)
            throw new InvalidOperationException("Solo se puede calificar proveedores que hayan aceptado la invitación.");

        if (request.QualificationStatus == QualificationStatus.Rejected && string.IsNullOrWhiteSpace(request.Notes))
            throw new InvalidOperationException("Debe indicar el fundamento para rechazar un proveedor.");

        // Allow transition from Observed to Approved (subsanación)
        if (invitation.QualificationStatus == QualificationStatus.Approved && request.QualificationStatus != QualificationStatus.Approved)
            throw new InvalidOperationException("No se puede cambiar la calificación de un proveedor ya aprobado.");

        invitation.QualificationStatus = request.QualificationStatus;
        invitation.QualificationNotes = request.Notes?.Trim();
        invitation.QualifiedById = request.EvaluatorId;
        invitation.QualifiedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new QualificationSupplierDto
        {
            InvitationId = invitation.Id,
            SupplierId = invitation.SupplierId,
            BusinessName = invitation.Supplier.BusinessName,
            Cuit = invitation.Supplier.Cuit,
            QualificationStatus = invitation.QualificationStatus,
            QualificationNotes = invitation.QualificationNotes,
            QualifiedById = invitation.QualifiedById,
            QualifiedByName = invitation.QualifiedBy != null ? invitation.QualifiedBy.FirstName + " " + invitation.QualifiedBy.LastName : null,
            QualifiedAtUtc = invitation.QualifiedAtUtc
        };
    }
}
