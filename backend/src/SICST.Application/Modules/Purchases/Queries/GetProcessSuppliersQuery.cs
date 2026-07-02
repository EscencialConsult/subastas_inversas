using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Queries;

public record GetProcessSuppliersQuery(Guid CompanyId, Guid PurchaseProcessId) : IRequest<List<QualificationSupplierDto>>;

public class GetProcessSuppliersQueryHandler : IRequestHandler<GetProcessSuppliersQuery, List<QualificationSupplierDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProcessSuppliersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<QualificationSupplierDto>> Handle(GetProcessSuppliersQuery request, CancellationToken cancellationToken)
    {
        var processExists = await _context.PurchaseProcesses
            .AnyAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (!processExists)
            throw new InvalidOperationException("Proceso de compra no encontrado.");

        return await _context.Invitations
            .Where(i => i.PurchaseProcessId == request.PurchaseProcessId && i.Status == InvitationStatus.Accepted)
            .OrderBy(i => i.Supplier.BusinessName)
            .Select(i => new QualificationSupplierDto
            {
                InvitationId = i.Id,
                SupplierId = i.SupplierId,
                BusinessName = i.Supplier.BusinessName,
                Cuit = i.Supplier.Cuit,
                QualificationStatus = i.QualificationStatus,
                QualificationNotes = i.QualificationNotes,
                QualifiedById = i.QualifiedById,
                QualifiedByName = i.QualifiedBy != null ? i.QualifiedBy.FirstName + " " + i.QualifiedBy.LastName : null,
                QualifiedAtUtc = i.QualifiedAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
