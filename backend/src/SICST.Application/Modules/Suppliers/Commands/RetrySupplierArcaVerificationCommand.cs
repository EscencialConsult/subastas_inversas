using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Commands;

public record RetrySupplierArcaVerificationCommand(Guid SupplierId) : IRequest;

public class RetrySupplierArcaVerificationCommandHandler : IRequestHandler<RetrySupplierArcaVerificationCommand>
{
    private readonly IApplicationDbContext _context;

    public RetrySupplierArcaVerificationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RetrySupplierArcaVerificationCommand request, CancellationToken cancellationToken)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (supplier is null)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        supplier.Status = SupplierStatus.Pending;
        supplier.ArcaVerified = false;
        supplier.ArcaVerificationStatus = ArcaVerificationStatus.Pending;
        supplier.ArcaVerifiedAtUtc = null;
        supplier.ArcaVerificationNotes = "Pendiente de reintento de verificación ARCA.";
        supplier.ArcaBusinessNameMatchScore = null;
        supplier.ArcaVerificationExpiresAtUtc = null;
        supplier.User.Active = false;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
