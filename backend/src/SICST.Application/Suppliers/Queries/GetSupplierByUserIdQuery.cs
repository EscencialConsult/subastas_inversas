using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;

namespace SICST.Application.Suppliers.Queries;

public record GetSupplierByUserIdQuery(Guid UserId) : IRequest<SupplierDto?>;

public class GetSupplierByUserIdQueryHandler : IRequestHandler<GetSupplierByUserIdQuery, SupplierDto?>
{
    private readonly IApplicationDbContext _context;

    public GetSupplierByUserIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDto?> Handle(GetSupplierByUserIdQuery request, CancellationToken cancellationToken)
    {
        return await _context.Suppliers
            .Where(s => s.UserId == request.UserId)
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
            .FirstOrDefaultAsync(cancellationToken);
    }
}
