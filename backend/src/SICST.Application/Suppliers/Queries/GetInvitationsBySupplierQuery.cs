using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetInvitationsBySupplierQuery(Guid SupplierId) : IRequest<List<InvitationDto>>;

public class GetInvitationsBySupplierQueryHandler : IRequestHandler<GetInvitationsBySupplierQuery, List<InvitationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInvitationsBySupplierQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InvitationDto>> Handle(GetInvitationsBySupplierQuery request, CancellationToken cancellationToken)
    {
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (!supplierExists)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        return await _context.Invitations
            .Where(i => i.SupplierId == request.SupplierId)
            .OrderByDescending(i => i.InvitedAtUtc)
            .Select(i => new InvitationDto
            {
                Id = i.Id,
                PurchaseProcessId = i.PurchaseProcessId,
                SupplierId = i.SupplierId,
                Status = i.Status,
                InvitedAtUtc = i.InvitedAtUtc,
                SupplierBusinessName = i.Supplier.BusinessName,
                SupplierCuit = i.Supplier.Cuit,
                ProcessTitle = i.PurchaseProcess.Title,
                ProcessCode = i.PurchaseProcess.Code
            })
            .ToListAsync(cancellationToken);
    }
}
