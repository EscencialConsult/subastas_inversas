using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record RespondToInvitationCommand : IRequest<InvitationDto>
{
    public Guid InvitationId { get; init; }
    public Guid SupplierId { get; init; }
    public InvitationStatus NewStatus { get; init; }
    public string? RejectionReason { get; init; }
}

public class RespondToInvitationCommandHandler : IRequestHandler<RespondToInvitationCommand, InvitationDto>
{
    private readonly IApplicationDbContext _context;

    public RespondToInvitationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InvitationDto> Handle(RespondToInvitationCommand request, CancellationToken cancellationToken)
    {
        if (request.NewStatus != InvitationStatus.Accepted && request.NewStatus != InvitationStatus.Rejected)
        {
            throw new InvalidOperationException("Solo se puede aceptar o rechazar una invitacion.");
        }

        var invitation = await _context.Invitations
            .Include(i => i.Supplier)
            .Include(i => i.PurchaseProcess)
            .FirstOrDefaultAsync(i => i.Id == request.InvitationId, cancellationToken);

        if (invitation == null)
        {
            throw new InvalidOperationException("Invitacion no encontrada.");
        }

        if (invitation.SupplierId != request.SupplierId)
        {
            throw new InvalidOperationException("Esta invitacion no pertenece al proveedor especificado.");
        }

        if (invitation.Status != InvitationStatus.Pending)
        {
            throw new InvalidOperationException("Esta invitacion ya fue respondida.");
        }

        if (request.NewStatus == InvitationStatus.Rejected)
        {
            if (string.IsNullOrWhiteSpace(request.RejectionReason))
            {
                throw new InvalidOperationException("Debe especificar un motivo para rechazar la invitación.");
            }
            invitation.RejectionReason = request.RejectionReason;
        }

        invitation.Status = request.NewStatus;
        await _context.SaveChangesAsync(cancellationToken);

        Console.WriteLine($"[Notificación] El proveedor '{invitation.Supplier.BusinessName}' ha {(request.NewStatus == InvitationStatus.Accepted ? "ACEPTADO" : "RECHAZADO")} la invitación al proceso de compra '{invitation.PurchaseProcess.Code}'.{(request.NewStatus == InvitationStatus.Rejected ? $" Motivo: {request.RejectionReason}" : "")}");

        return new InvitationDto
        {
            Id = invitation.Id,
            PurchaseProcessId = invitation.PurchaseProcessId,
            SupplierId = invitation.SupplierId,
            Status = invitation.Status,
            InvitedAtUtc = invitation.InvitedAtUtc,
            SupplierBusinessName = invitation.Supplier.BusinessName,
            SupplierCuit = invitation.Supplier.Cuit,
            ProcessTitle = invitation.PurchaseProcess.Title,
            ProcessCode = invitation.PurchaseProcess.Code,
            RejectionReason = invitation.RejectionReason
        };
    }
}
