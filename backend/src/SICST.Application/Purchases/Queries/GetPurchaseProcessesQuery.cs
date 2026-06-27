using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Queries;

public record GetPurchaseProcessesQuery(
    Guid CompanyId, 
    string? Search = null, 
    PurchaseProcessStatus? Status = null,
    int PageNumber = 1,
    int PageSize = 10) : IRequest<PagedResult<PurchaseProcessDto>>;

public class GetPurchaseProcessesQueryHandler : IRequestHandler<GetPurchaseProcessesQuery, PagedResult<PurchaseProcessDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPurchaseProcessesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<PurchaseProcessDto>> Handle(GetPurchaseProcessesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation).ThenInclude(e => e!.Evaluator)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.AdjudicatedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Include(p => p.Contracts).ThenInclude(c => c.Supplier)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Supplier)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Receptions).ThenInclude(r => r.ReceivedBy)
            .Include(p => p.PurchaseOrders).ThenInclude(o => o.Receptions).ThenInclude(r => r.Items).ThenInclude(i => i.PurchaseItem)
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

        var totalCount = await query.CountAsync(cancellationToken);

        var processes = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var processIds = processes.Select(p => p.Id).ToList();
        var processIdsWithAuction = await _context.Auctions
            .Where(a => processIds.Contains(a.PurchaseProcessId))
            .Select(a => a.PurchaseProcessId)
            .ToHashSetAsync(cancellationToken);

        var dtos = processes.Select(PurchaseProcessMapping.ToDto).ToList();
        foreach (var dto in dtos)
        {
            dto.HasAuction = processIdsWithAuction.Contains(dto.Id);
        }

        return new PagedResult<PurchaseProcessDto>(dtos, totalCount, request.PageNumber, request.PageSize);
    }
}
