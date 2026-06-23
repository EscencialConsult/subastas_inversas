using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetSuppliersQuery : IRequest<List<SupplierDto>>;

public class GetSuppliersQueryHandler : IRequestHandler<GetSuppliersQuery, List<SupplierDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSuppliersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SupplierDto>> Handle(GetSuppliersQuery request, CancellationToken cancellationToken)
    {
        return await _context.Suppliers
            .OrderBy(s => s.BusinessName)
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
    }
}
