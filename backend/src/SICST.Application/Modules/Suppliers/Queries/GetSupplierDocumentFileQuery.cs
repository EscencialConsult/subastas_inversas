using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Suppliers.Queries;

// RequestingUserId + RequesterIsStaff llegan desde el token (los pone el controlador),
// para impedir que un proveedor descargue el PDF de otro proveedor (IDOR).
public record GetSupplierDocumentFileQuery(Guid DocumentId, Guid RequestingUserId, bool RequesterIsStaff)
    : IRequest<SupplierDocumentFileDto?>;

public class SupplierDocumentFileDto
{
    public Guid Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string StoragePath { get; set; } = string.Empty;
}

public class GetSupplierDocumentFileQueryHandler : IRequestHandler<GetSupplierDocumentFileQuery, SupplierDocumentFileDto?>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierDocumentFileQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDocumentFileDto?> Handle(GetSupplierDocumentFileQuery request, CancellationToken cancellationToken)
    {
        var document = await _context.SupplierDocuments
            .Where(d => d.Id == request.DocumentId)
            .Select(d => new
            {
                d.Id,
                d.FileName,
                d.ContentType,
                d.StoragePath,
                OwnerUserId = d.Supplier.UserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (document is null)
        {
            return null;
        }

        // Solo el proveedor dueño del documento (o el personal del organismo) puede descargarlo.
        if (!request.RequesterIsStaff && document.OwnerUserId != request.RequestingUserId)
        {
            throw new UnauthorizedAccessException("No tenés acceso a este documento.");
        }

        return new SupplierDocumentFileDto
        {
            Id = document.Id,
            FileName = document.FileName,
            ContentType = document.ContentType,
            StoragePath = document.StoragePath
        };
    }
}
