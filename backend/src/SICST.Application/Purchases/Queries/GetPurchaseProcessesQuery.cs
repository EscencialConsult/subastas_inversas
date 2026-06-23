using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Queries;

public record GetPurchaseProcessesQuery(Guid CompanyId, string? Search = null, PurchaseProcessStatus? Status = null) : IRequest<List<PurchaseProcessDto>>;

public class GetPurchaseProcessesQueryHandler : IRequestHandler<GetPurchaseProcessesQuery, List<PurchaseProcessDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPurchaseProcessesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PurchaseProcessDto>> Handle(GetPurchaseProcessesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.PurchaseProcesses
            .Include(p => p.Items)
            .Where(p => p.CompanyId == request.CompanyId);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Code.ToLower().Contains(search) || p.Title.ToLower().Contains(search));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(p => p.Status == request.Status.Value);
        }

        var processes = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return processes.Select(PurchaseProcessMapping.ToDto).ToList();
    }
}
