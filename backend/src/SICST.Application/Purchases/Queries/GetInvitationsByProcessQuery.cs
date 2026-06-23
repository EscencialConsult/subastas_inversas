using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;

namespace SICST.Application.Purchases.Queries;

public record GetInvitationsByProcessQuery(Guid CompanyId, Guid PurchaseProcessId) : IRequest<List<InvitationDto>>;

public class GetInvitationsByProcessQueryHandler : IRequestHandler<GetInvitationsByProcessQuery, List<InvitationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInvitationsByProcessQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InvitationDto>> Handle(GetInvitationsByProcessQuery request, CancellationToken cancellationToken)
    {
        var processExists = await _context.PurchaseProcesses
            .AnyAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (!processExists)
        {
            throw new InvalidOperationException("Proceso de compra no encontrado.");
        }

        return await _context.Invitations
            .Where(i => i.PurchaseProcessId == request.PurchaseProcessId)
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
