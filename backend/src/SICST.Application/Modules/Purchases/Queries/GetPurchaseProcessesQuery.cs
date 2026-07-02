using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Queries;

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
        var pageNumber = Paging.NormalizePageNumber(request.PageNumber);
        var pageSize = Paging.NormalizePageSize(request.PageSize);

        var query = _context.PurchaseProcesses
            .AsNoTracking()
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

        var items = await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PurchaseProcessDto
            {
                Id = p.Id,
                CompanyId = p.CompanyId,
                BuyerId = p.BuyerId,
                ContractingModeId = p.ContractingModeId,
                Code = p.Code,
                Title = p.Title,
                Description = p.Description,
                EstimatedBudget = p.EstimatedBudget,
                Status = p.Status,
                CreatedAtUtc = p.CreatedAtUtc,
                PublishedAtUtc = p.PublishedAtUtc,
                ClosedAtUtc = p.ClosedAtUtc,
                RejectionReason = p.RejectionReason,
                SpecificationsHash = p.SpecificationsHash,
                IsEvaluationActSigned = p.IsEvaluationActSigned,
                EvaluationActHash = p.EvaluationActHash,
                EvaluationActSignature = p.EvaluationActSignature,
                EvaluationActSignedAtUtc = p.EvaluationActSignedAtUtc,
                EvaluationActSignedById = p.EvaluationActSignedById,
            })
            .ToListAsync(cancellationToken);

        if (items.Count == 0)
        {
            return new PagedResult<PurchaseProcessDto>(items, totalCount, pageNumber, pageSize);
        }

        var processIds = items.Select(i => i.Id).ToList();

        var processIdsWithAuction = await _context.Auctions
            .AsNoTracking()
            .Where(a => processIds.Contains(a.PurchaseProcessId))
            .Select(a => a.PurchaseProcessId)
            .ToHashSetAsync(cancellationToken);

        var awardRows = await _context.Awards
            .AsNoTracking()
            .Where(a => processIds.Contains(a.PurchaseProcessId))
            .OrderBy(a => a.AdjudicatedAtUtc)
            .Select(a => new
            {
                a.PurchaseProcessId,
                a.AdjudicatedAtUtc,
                Dto = new AwardDto
                {
                    Id = a.Id,
                    PurchaseProcessId = a.PurchaseProcessId,
                    SupplierId = a.SupplierId,
                    Proveedor = a.Supplier.BusinessName,
                    Monto = a.Amount,
                    AprobadorId = a.AdjudicatedById,
                    Observaciones = a.Observations,
                    DocumentHash = a.DocumentHash,
                    ImmutableHash = a.ImmutableHash,
                    DocumentTemplateId = a.DocumentTemplateId,
                    ActaUrl = $"/api/companies/{request.CompanyId}/purchase-processes/{a.PurchaseProcessId}/awards/{a.Id}/pdf"
                }
            })
            .ToListAsync(cancellationToken);

        var awardsByProcess = awardRows
            .GroupBy(row => row.PurchaseProcessId)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var first = group.First();
                    first.Dto.Fecha = first.AdjudicatedAtUtc.ToString("yyyy-MM-dd");
                    return first.Dto;
                });

        var contractsByProcess = await _context.Contracts
            .AsNoTracking()
            .Where(c => processIds.Contains(c.PurchaseProcessId))
            .OrderBy(c => c.CreatedAtUtc)
            .Select(c => new ContractDto
            {
                Id = c.Id,
                CompanyId = c.CompanyId,
                PurchaseProcessId = c.PurchaseProcessId,
                AwardId = c.AwardId,
                SupplierId = c.SupplierId,
                SupplierName = c.Supplier.BusinessName,
                Number = c.Number,
                Amount = c.Amount,
                StartDateUtc = c.StartDateUtc,
                EndDateUtc = c.EndDateUtc,
                Status = c.Status,
                CreatedAtUtc = c.CreatedAtUtc,
                SignedAtUtc = c.SignedAtUtc,
                DocumentUrl = $"/api/companies/{c.CompanyId}/contracts/{c.Id}/pdf",
                DocumentTemplateId = c.DocumentTemplateId
            })
            .ToListAsync(cancellationToken);

        var firstContractByProcess = contractsByProcess
            .GroupBy(c => c.PurchaseProcessId)
            .ToDictionary(group => group.Key, group => group.First());

        var ordersByProcess = await _context.PurchaseOrders
            .AsNoTracking()
            .Where(o => processIds.Contains(o.PurchaseProcessId))
            .OrderBy(o => o.IssuedAtUtc)
            .Select(o => new PurchaseOrderDto
            {
                Id = o.Id,
                CompanyId = o.CompanyId,
                PurchaseProcessId = o.PurchaseProcessId,
                ContractId = o.ContractId,
                SupplierId = o.SupplierId,
                SupplierName = o.Supplier.BusinessName,
                Number = o.Number,
                Amount = o.Amount,
                Status = o.Status,
                IssuedAtUtc = o.IssuedAtUtc,
                ExpectedDeliveryDateUtc = o.ExpectedDeliveryDateUtc,
                Observations = o.Observations,
                DocumentUrl = $"/api/companies/{o.CompanyId}/purchase-orders/{o.Id}/pdf",
                DocumentTemplateId = o.DocumentTemplateId
            })
            .ToListAsync(cancellationToken);

        var firstOrderByProcess = ordersByProcess
            .GroupBy(o => o.PurchaseProcessId)
            .ToDictionary(group => group.Key, group => group.First());

        foreach (var item in items)
        {
            item.HasAuction = processIdsWithAuction.Contains(item.Id);

            if (awardsByProcess.TryGetValue(item.Id, out var award))
            {
                item.Award = award;
            }

            if (firstContractByProcess.TryGetValue(item.Id, out var contract))
            {
                item.Contract = contract;
            }

            if (firstOrderByProcess.TryGetValue(item.Id, out var order))
            {
                item.PurchaseOrder = order;
            }

            if (item.Award != null)
            {
                item.Awards = [item.Award];
            }

            if (item.Contract != null)
            {
                item.Contracts = [item.Contract];
            }

            if (item.PurchaseOrder != null)
            {
                item.PurchaseOrders = [item.PurchaseOrder];
            }
        }

        return new PagedResult<PurchaseProcessDto>(items, totalCount, pageNumber, pageSize);
    }
}
