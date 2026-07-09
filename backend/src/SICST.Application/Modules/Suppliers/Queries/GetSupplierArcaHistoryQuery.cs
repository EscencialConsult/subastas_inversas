using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Suppliers.DTOs;

namespace SICST.Application.Modules.Suppliers.Queries;

public record GetSupplierArcaHistoryQuery(Guid SupplierId) : IRequest<List<ArcaHistoryDto>>;

public class GetSupplierArcaHistoryQueryHandler : IRequestHandler<GetSupplierArcaHistoryQuery, List<ArcaHistoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierArcaHistoryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ArcaHistoryDto>> Handle(GetSupplierArcaHistoryQuery request, CancellationToken cancellationToken)
    {
        return await _context.ArcaVerificationAudits
            .AsNoTracking()
            .Where(a => a.SupplierId == request.SupplierId)
            .OrderByDescending(a => a.CreatedAtUtc)
            .Select(a => new ArcaHistoryDto
            {
                Id = a.Id,
                SupplierId = a.SupplierId,
                Result = a.Result,
                Notes = a.Notes,
                Source = a.Source,
                BusinessNameMatchScore = a.BusinessNameMatchScore,
                CuitConsulted = a.CuitConsulted,
                BusinessNameDeclared = a.BusinessNameDeclared,
                BusinessNameFoundInArca = a.BusinessNameFoundInArca,
                RawResponseSummary = a.RawResponseSummary,
                ReviewedByUserId = a.ReviewedByUserId,
                Automatic = a.Automatic,
                CreatedAtUtc = a.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
