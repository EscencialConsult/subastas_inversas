using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public.Queries;

public record GetPublicPurchaseProcessesQuery(Guid? CompanyId = null, string? Search = null) : IRequest<List<PublicPurchaseProcessDto>>;

public class GetPublicPurchaseProcessesQueryHandler : IRequestHandler<GetPublicPurchaseProcessesQuery, List<PublicPurchaseProcessDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPublicPurchaseProcessesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PublicPurchaseProcessDto>> Handle(GetPublicPurchaseProcessesQuery request, CancellationToken cancellationToken)
    {
        var publicStatuses = new[]
        {
            PurchaseProcessStatus.PendingApproval,
            PurchaseProcessStatus.Approved,
            PurchaseProcessStatus.InAuction,
            PurchaseProcessStatus.Evaluation,
            PurchaseProcessStatus.Adjudicated,
            PurchaseProcessStatus.Contracted,
            PurchaseProcessStatus.PurchaseOrderIssued,
            PurchaseProcessStatus.Received,
            PurchaseProcessStatus.Closed
        };

        var query = _context.PurchaseProcesses
            .Include(p => p.Company)
            .Where(p => publicStatuses.Contains(p.Status));

        if (request.CompanyId.HasValue)
        {
            query = query.Where(p => p.CompanyId == request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Code.ToLower().Contains(search) || p.Title.ToLower().Contains(search));
        }

        return await query
            .OrderByDescending(p => p.PublishedAtUtc ?? p.CreatedAtUtc)
            .Select(p => new PublicPurchaseProcessDto
            {
                Id = p.Id,
                CompanyId = p.CompanyId,
                CompanyName = p.Company.Name,
                Code = p.Code,
                Title = p.Title,
                Description = p.Description,
                EstimatedBudget = p.EstimatedBudget,
                Status = p.Status,
                CreatedAtUtc = p.CreatedAtUtc,
                PublishedAtUtc = p.PublishedAtUtc,
                HasAuction = _context.Auctions.Any(a => a.PurchaseProcessId == p.Id)
            })
            .ToListAsync(cancellationToken);
    }
}
