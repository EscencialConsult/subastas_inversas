using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Commands;

// "Elimina" un documento del proveedor desde su vista: en realidad lo ARCHIVA (soft-delete).
// Solo el proveedor DUEÑO puede hacerlo, y únicamente si el documento NO está aprobado
// (pendiente, observado o rechazado). El registro y sus dictámenes inmutables se conservan
// para auditoría; un filtro global de EF lo oculta de todas las consultas normales.
public record DeleteSupplierDocumentCommand(Guid DocumentId, Guid RequestingUserId) : IRequest;

public class DeleteSupplierDocumentCommandHandler : IRequestHandler<DeleteSupplierDocumentCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteSupplierDocumentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteSupplierDocumentCommand request, CancellationToken cancellationToken)
    {
        var document = await _context.SupplierDocuments
            .Include(d => d.Supplier)
            .Include(d => d.Reviews)
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId, cancellationToken);

        if (document is null)
        {
            throw new InvalidOperationException("Documento no encontrado.");
        }

        // El documento debe pertenecer al proveedor del usuario logueado.
        if (document.Supplier.UserId != request.RequestingUserId)
        {
            throw new UnauthorizedAccessException("No tenés acceso a este documento.");
        }

        // Solo se pueden archivar documentos NO aprobados. Los aprobados quedan protegidos.
        var latestVerdict = document.Reviews
            .Where(r => r.Action == SupplierDocumentReviewAction.Verdict)
            .OrderByDescending(r => r.CreatedAtUtc)
            .FirstOrDefault()?.Verdict;

        if (latestVerdict is SupplierDocumentVerdict.Approved or SupplierDocumentVerdict.ApprovedWithException)
        {
            throw new InvalidOperationException("No se puede eliminar un documento ya aprobado.");
        }

        // Soft-delete: se archiva. No se borran ni el archivo ni las revisiones (auditoría).
        document.ArchivedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
