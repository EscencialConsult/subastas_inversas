using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.Queries;

public record GetSupplierDocumentsQuery(Guid SupplierId) : IRequest<List<SupplierDocumentDto>>;

public class GetSupplierDocumentsQueryHandler : IRequestHandler<GetSupplierDocumentsQuery, List<SupplierDocumentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierDocumentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierDocumentDto>> Handle(GetSupplierDocumentsQuery request, CancellationToken cancellationToken)
    {
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (!supplierExists)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
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
