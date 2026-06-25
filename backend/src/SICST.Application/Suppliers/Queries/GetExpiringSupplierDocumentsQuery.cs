using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetExpiringSupplierDocumentsQuery(int DaysAhead = 30) : IRequest<List<SupplierDocumentDto>>;

public class GetExpiringSupplierDocumentsQueryHandler : IRequestHandler<GetExpiringSupplierDocumentsQuery, List<SupplierDocumentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetExpiringSupplierDocumentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierDocumentDto>> Handle(GetExpiringSupplierDocumentsQuery request, CancellationToken cancellationToken)
    {
        var daysAhead = Math.Max(0, request.DaysAhead);
        var now = DateTime.UtcNow;
        var threshold = now.AddDays(daysAhead);

        var documents = await _context.SupplierDocuments
            .Include(d => d.Reviews)
            .Where(d => d.ExpiresAtUtc <= threshold)
            .OrderBy(d => d.ExpiresAtUtc)
            .ToListAsync(cancellationToken);

        var hasChanges = GetSupplierDocumentsQueryHandler.RefreshStatuses(documents, now, daysAhead);
        if (hasChanges)
        {
            await _context.SaveChangesAsync(cancellationToken);
        }

        return documents.Select(SupplierDocumentMapper.ToDto).ToList();
    }
}
