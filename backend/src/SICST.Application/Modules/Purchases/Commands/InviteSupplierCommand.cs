using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Events;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record InviteSupplierCommand : IRequest<InvitationDto>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public Guid SupplierId { get; init; }
}

public class InviteSupplierCommandHandler : IRequestHandler<InviteSupplierCommand, InvitationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IOutboxWriter _outbox;

    public InviteSupplierCommandHandler(IApplicationDbContext context, IOutboxWriter? outbox = null)
    {
        _context = context;
        _outbox = outbox ?? NullOutboxWriter.Instance;
    }

    public async Task<InvitationDto> Handle(InviteSupplierCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            throw new InvalidOperationException("Proceso de compra no encontrado.");
        }

        if (process.Status == PurchaseProcessStatus.Closed)
        {
            throw new InvalidOperationException("No se puede invitar proveedores a un proceso cerrado.");
        }

        var supplierExists = await _context.Suppliers.AnyAsync(s => s.Id == request.SupplierId, cancellationToken);
        if (!supplierExists)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        var companySupplier = await _context.CompanySuppliers
            .FirstOrDefaultAsync(cs => cs.CompanyId == request.CompanyId && cs.SupplierId == request.SupplierId, cancellationToken);

        if (companySupplier == null)
        {
            throw new InvalidOperationException("El proveedor no esta habilitado para esta empresa.");
        }

        if (companySupplier.Status == CompanySupplierStatus.Blocked)
        {
            throw new InvalidOperationException(companySupplier.WarningMessage ?? "El proveedor esta bloqueado para esta empresa.");
        }

        var exists = await _context.Invitations
            .AnyAsync(i => i.PurchaseProcessId == request.PurchaseProcessId && i.SupplierId == request.SupplierId, cancellationToken);

        if (exists)
        {
            throw new InvalidOperationException("El proveedor ya fue invitado a este proceso.");
        }

        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = request.PurchaseProcessId,
            SupplierId = request.SupplierId,
            Status = InvitationStatus.Pending,
            InvitedAtUtc = DateTime.UtcNow
        };

        _context.Invitations.Add(invitation);
        _outbox.Add(new SupplierInvited(
            Guid.NewGuid(),
            request.CompanyId,
            request.PurchaseProcessId,
            request.SupplierId,
            invitation.Id,
            invitation.InvitedAtUtc,
            DateTime.UtcNow));

        await _context.SaveChangesAsync(cancellationToken);

        return new InvitationDto
        {
            Id = invitation.Id,
            PurchaseProcessId = invitation.PurchaseProcessId,
            SupplierId = invitation.SupplierId,
            Status = invitation.Status,
            InvitedAtUtc = invitation.InvitedAtUtc,
            RejectionReason = invitation.RejectionReason
        };
    }
}
