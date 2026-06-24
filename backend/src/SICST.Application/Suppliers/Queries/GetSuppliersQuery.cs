using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetSuppliersQuery(int PageNumber = 1, int PageSize = 10) : IRequest<PagedResult<SupplierDto>>;

public class GetSuppliersQueryHandler : IRequestHandler<GetSuppliersQuery, PagedResult<SupplierDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSuppliersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<SupplierDto>> Handle(GetSuppliersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Suppliers.AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(s => s.BusinessName)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                UserId = s.UserId,
                Cuit = s.Cuit,
                BusinessName = s.BusinessName,
                Email = s.Email,
                Province = s.Province,
                Locality = s.Locality,
                Status = s.Status,
                ArcaVerified = s.ArcaVerified
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<SupplierDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
