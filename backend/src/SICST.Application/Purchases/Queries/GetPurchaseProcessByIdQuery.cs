using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;

namespace SICST.Application.Purchases.Queries;

public record GetPurchaseProcessByIdQuery(Guid CompanyId, Guid Id) : IRequest<PurchaseProcessDto?>;

public class GetPurchaseProcessByIdQueryHandler : IRequestHandler<GetPurchaseProcessByIdQuery, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPurchaseProcessByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(GetPurchaseProcessByIdQuery request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        return process == null ? null : PurchaseProcessMapping.ToDto(process);
    }
}
