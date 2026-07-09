using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Suppliers.Commands;

public record DeleteSupplierCommand(Guid SupplierId) : IRequest;

public class DeleteSupplierCommandHandler : IRequestHandler<DeleteSupplierCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteSupplierCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteSupplierCommand request, CancellationToken cancellationToken)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (supplier is null)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        if (await HasOperationalRecords(request.SupplierId, cancellationToken))
        {
            throw new InvalidOperationException(
                "No se puede eliminar un proveedor con lances, adjudicaciones, contratos u ordenes de compra registrados.");
        }

        if (await HasDocumentReviews(request.SupplierId, cancellationToken))
        {
            throw new InvalidOperationException(
                "No se puede eliminar un proveedor con revisiones documentales registradas.");
        }

        var companySuppliers = await _context.CompanySuppliers
            .Where(cs => cs.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);
        var invitations = await _context.Invitations
            .Where(i => i.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);
        var participants = await _context.AuctionParticipants
            .Where(p => p.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);
        var supplierEvaluations = await _context.SupplierEvaluations
            .Where(e => e.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);
        var documents = await _context.SupplierDocuments
            .Where(d => d.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);

        _context.CompanySuppliers.RemoveRange(companySuppliers);
        _context.Invitations.RemoveRange(invitations);
        _context.AuctionParticipants.RemoveRange(participants);
        _context.SupplierEvaluations.RemoveRange(supplierEvaluations);
        _context.SupplierDocuments.RemoveRange(documents);
        _context.Suppliers.Remove(supplier);
        _context.Users.Remove(supplier.User);

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<bool> HasOperationalRecords(Guid supplierId, CancellationToken cancellationToken)
    {
        return await _context.Bids.AnyAsync(b => b.SupplierId == supplierId, cancellationToken)
            || await _context.Awards.AnyAsync(a => a.SupplierId == supplierId, cancellationToken)
            || await _context.Contracts.AnyAsync(c => c.SupplierId == supplierId, cancellationToken)
            || await _context.PurchaseOrders.AnyAsync(po => po.SupplierId == supplierId, cancellationToken);
    }

    private async Task<bool> HasDocumentReviews(Guid supplierId, CancellationToken cancellationToken)
    {
        return await _context.SupplierDocumentReviews
            .AnyAsync(r => r.SupplierDocument.SupplierId == supplierId, cancellationToken);
    }
}
