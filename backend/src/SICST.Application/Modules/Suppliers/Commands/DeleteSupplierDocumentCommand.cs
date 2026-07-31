using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Commands;

// Elimina un documento del proveedor. Solo el proveedor DUEÑO puede borrarlo, y únicamente si
// NO está aprobado (pendiente de dictamen, observado o rechazado). Los documentos aprobados
// quedan protegidos por trazabilidad. Borra el archivo del almacenamiento y el registro.
public record DeleteSupplierDocumentCommand(Guid DocumentId, Guid RequestingUserId) : IRequest;

public class DeleteSupplierDocumentCommandHandler : IRequestHandler<DeleteSupplierDocumentCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;

    public DeleteSupplierDocumentCommandHandler(IApplicationDbContext context, IFileStorage fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
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

        // Solo se pueden eliminar documentos NO aprobados. Los aprobados quedan protegidos.
        var latestVerdict = document.Reviews
            .Where(r => r.Action == SupplierDocumentReviewAction.Verdict)
            .OrderByDescending(r => r.CreatedAtUtc)
            .FirstOrDefault()?.Verdict;

        if (latestVerdict is SupplierDocumentVerdict.Approved or SupplierDocumentVerdict.ApprovedWithException)
        {
            throw new InvalidOperationException("No se puede eliminar un documento ya aprobado.");
        }

        // Borrar el archivo del almacenamiento (best-effort) y luego el registro + sus revisiones.
        if (!string.IsNullOrWhiteSpace(document.StoragePath))
        {
            await _fileStorage.DeleteAsync(document.StoragePath, cancellationToken);
        }

        _context.SupplierDocumentReviews.RemoveRange(document.Reviews);
        _context.SupplierDocuments.Remove(document);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
