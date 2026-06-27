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
            .Include(p => p.Evaluation).ThenInclude(e => e!.Evaluator)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.AdjudicatedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Include(p => p.Contracts).ThenInclude(c => c.Supplier)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Supplier)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Receptions).ThenInclude(r => r.ReceivedBy)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Receptions).ThenInclude(r => r.Items).ThenInclude(i => i.PurchaseItem)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        var dto = PurchaseProcessMapping.ToDto(process);
        dto.HasAuction = await _context.Auctions
            .AnyAsync(a => a.PurchaseProcessId == process.Id, cancellationToken);

        return dto;
    }
}
