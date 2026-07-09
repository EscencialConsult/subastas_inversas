using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Suppliers.Queries;

public record GetSupplierDocumentFileQuery(Guid DocumentId) : IRequest<SupplierDocumentFileDto?>;

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
        return await _context.SupplierDocuments
            .Where(d => d.Id == request.DocumentId)
            .Select(d => new SupplierDocumentFileDto
            {
                Id = d.Id,
                FileName = d.FileName,
                ContentType = d.ContentType,
                StoragePath = d.StoragePath
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}
