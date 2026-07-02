using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Modules.Suppliers.DTOs;

namespace SICST.Application.Modules.Suppliers.Queries;

public record GetSuppliersQuery(
    int PageNumber = 1,
    int PageSize = 10,
    Guid? CompanyId = null,
    string? Search = null,
    string? BusinessCategory = null,
    string? Province = null,
    string? Locality = null,
    string? Proximity = null) : IRequest<PagedResult<SupplierDto>>;

public class GetSuppliersQueryHandler : IRequestHandler<GetSuppliersQuery, PagedResult<SupplierDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSuppliersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<SupplierDto>> Handle(GetSuppliersQuery request, CancellationToken cancellationToken)
    {
        var pageNumber = Paging.NormalizePageNumber(request.PageNumber);
        var pageSize = Paging.NormalizePageSize(request.PageSize);

        var query = _context.Suppliers.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(s =>
                s.BusinessName.ToLower().Contains(search) ||
                s.Cuit.ToLower().Contains(search) ||
                s.Email.ToLower().Contains(search) ||
                s.Province.ToLower().Contains(search) ||
                s.Locality.ToLower().Contains(search) ||
                s.BusinessCategory.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(request.BusinessCategory))
        {
            var category = request.BusinessCategory.Trim().ToLower();
            query = query.Where(s => s.BusinessCategory.ToLower().Contains(category));
        }

        if (string.Equals(request.Proximity, "sameLocality", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(request.Locality))
        {
            var locality = request.Locality.Trim().ToLower();
            query = query.Where(s => s.Locality.ToLower() == locality);
        }
        else if (string.Equals(request.Proximity, "sameProvince", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(request.Province))
        {
            var province = request.Province.Trim().ToLower();
            query = query.Where(s => s.Province.ToLower() == province);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.Province))
            {
                var province = request.Province.Trim().ToLower();
                query = query.Where(s => s.Province.ToLower().Contains(province));
            }

            if (!string.IsNullOrWhiteSpace(request.Locality))
            {
                var locality = request.Locality.Trim().ToLower();
                query = query.Where(s => s.Locality.ToLower().Contains(locality));
            }
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(s => s.BusinessName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Cuit = s.Cuit,
                BusinessName = s.BusinessName,
                Email = s.Email,
                BusinessCategory = s.BusinessCategory,
                Province = s.Province,
                Locality = s.Locality,
                Status = s.Status,
                ArcaVerified = s.ArcaVerified,
                ArcaVerificationStatus = s.ArcaVerificationStatus,
                ArcaVerifiedAtUtc = s.ArcaVerifiedAtUtc,
                ArcaVerificationNotes = s.ArcaVerificationNotes,
                CredentialsSentAtUtc = s.CredentialsSentAtUtc
            })
            .ToListAsync(cancellationToken);

        if (request.CompanyId.HasValue && items.Count > 0)
        {
            var supplierIds = items.Select(i => i.Id).ToList();
            var companySuppliers = await _context.CompanySuppliers
                .AsNoTracking()
                .Where(cs => cs.CompanyId == request.CompanyId.Value && supplierIds.Contains(cs.SupplierId))
                .ToDictionaryAsync(cs => cs.SupplierId, cancellationToken);

            var strictPolicy = await _context.CompanyConfigurations
                .AsNoTracking()
                .Where(c => c.CompanyId == request.CompanyId.Value)
                .Select(c => (bool?)c.RequireSupplierVerification)
                .FirstOrDefaultAsync(cancellationToken) ?? true;

            foreach (var item in items)
            {
                if (!companySuppliers.TryGetValue(item.Id, out var relation))
                {
                    continue;
                }

                item.CompanySupplierStatus = relation.Status;
                item.CompanySupplierWarning = relation.WarningMessage;
                item.CompanySupplierStrictPolicy = strictPolicy;
            }
        }

        return new PagedResult<SupplierDto>(items, totalCount, pageNumber, pageSize);
    }
}
