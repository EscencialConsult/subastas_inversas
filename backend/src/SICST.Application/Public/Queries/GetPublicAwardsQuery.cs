using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;

namespace SICST.Application.Public.Queries;

public record GetPublicAwardsQuery(Guid? CompanyId = null, string? Search = null) : IRequest<List<PublicAwardDto>>;

public class GetPublicAwardsQueryHandler : IRequestHandler<GetPublicAwardsQuery, List<PublicAwardDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPublicAwardsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PublicAwardDto>> Handle(GetPublicAwardsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Awards
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Supplier)
            .AsQueryable();

        if (request.CompanyId.HasValue)
        {
            query = query.Where(a => a.PurchaseProcess.CompanyId == request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(a =>
                a.PurchaseProcess.Code.ToLower().Contains(search) ||
                a.PurchaseProcess.Title.ToLower().Contains(search) ||
                a.Supplier.BusinessName.ToLower().Contains(search));
        }

        return await query
            .OrderByDescending(a => a.AdjudicatedAtUtc)
            .Select(a => new PublicAwardDto
            {
                Id = a.Id,
                PurchaseProcessId = a.PurchaseProcessId,
                CompanyId = a.PurchaseProcess.CompanyId,
                CompanyName = a.PurchaseProcess.Company.Name,
                ProcessCode = a.PurchaseProcess.Code,
                ProcessTitle = a.PurchaseProcess.Title,
                SupplierName = a.Supplier.BusinessName,
                Amount = a.Amount,
                AdjudicatedAtUtc = a.AdjudicatedAtUtc,
                Observations = a.Observations,
                ActUrl = $"/api/companies/{a.PurchaseProcess.CompanyId}/purchase-processes/{a.PurchaseProcessId}/awards/{a.Id}/pdf"
            })
            .ToListAsync(cancellationToken);
    }
}
