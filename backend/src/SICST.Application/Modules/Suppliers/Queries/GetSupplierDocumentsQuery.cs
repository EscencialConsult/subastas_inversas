using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Queries;

// RequestingUserId + RequesterIsStaff llegan desde el token (los pone el controlador).
// Sirven para que un proveedor solo vea SUS documentos y el personal del organismo, todos.
public record GetSupplierDocumentsQuery(Guid SupplierId, Guid RequestingUserId, bool RequesterIsStaff)
    : IRequest<List<SupplierDocumentDto>>;

public class GetSupplierDocumentsQueryHandler : IRequestHandler<GetSupplierDocumentsQuery, List<SupplierDocumentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierDocumentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierDocumentDto>> Handle(GetSupplierDocumentsQuery request, CancellationToken cancellationToken)
    {
        var supplier = await _context.Suppliers
            .Where(s => s.Id == request.SupplierId)
            .Select(s => new { s.Id, s.UserId })
            .FirstOrDefaultAsync(cancellationToken);

        if (supplier is null)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        // Un proveedor solo accede a SUS documentos; el personal del organismo puede revisar
        // los de cualquiera. Sin este chequeo, un proveedor podía leer el legajo de otro (IDOR).
        if (!request.RequesterIsStaff && supplier.UserId != request.RequestingUserId)
        {
            throw new UnauthorizedAccessException("No tenés acceso a los documentos de este proveedor.");
        }

        var documents = await _context.SupplierDocuments
            .Include(d => d.Reviews)
            .Where(d => d.SupplierId == request.SupplierId)
            .OrderByDescending(d => d.UploadedAtUtc)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var hasChanges = RefreshStatuses(documents, now);

        if (hasChanges)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return documents.Select(SupplierDocumentMapper.ToDto).ToList();
    }

    internal static bool RefreshStatuses(IEnumerable<SupplierDocument> documents, DateTime nowUtc, int daysAhead = SupplierDocumentMapper.DefaultExpiringSoonDays)
    {
        var hasChanges = false;

        foreach (var document in documents)
        {
            var status = SupplierDocumentMapper.ResolveStatus(document.ExpiresAtUtc, nowUtc, daysAhead);
            if (document.Status != status)
            {
                document.Status = status;
                hasChanges = true;
            }

            if (status is SupplierDocumentStatus.ExpiringSoon or SupplierDocumentStatus.Expired &&
                document.AlertSentAtUtc == null)
            {
                document.AlertSentAtUtc = nowUtc;
                hasChanges = true;
            }
        }

        return hasChanges;
    }
}
