using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Application.Modules.Suppliers.DTOs;

namespace SICST.Application.Modules.Suppliers.Queries;

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
        var nowUtc = DateTime.UtcNow;

        var supplier = await _context.Suppliers
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
                ArcaBusinessName = s.ArcaBusinessName,
                ArcaFiscalAddress = s.ArcaFiscalAddress,
                ArcaIvaCondition = s.ArcaIvaCondition,
                ArcaBusinessNameMatchScore = s.ArcaBusinessNameMatchScore,
                ArcaVerificationExpiresAtUtc = s.ArcaVerificationExpiresAtUtc,
                CredentialsSentAtUtc = s.CredentialsSentAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (supplier is null)
        {
            return null;
        }

        var documents = await _context.SupplierDocuments
            .AsNoTracking()
            .Where(document => document.SupplierId == supplier.Id)
            .Select(document => new
            {
                document.ExpiresAtUtc,
                Verdict = document.Reviews
                    .Where(review => review.Action == SupplierDocumentReviewAction.Verdict)
                    .OrderByDescending(review => review.CreatedAtUtc)
                    .Select(review => review.Verdict)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        SupplierSummaryBuilder.ApplyDocumentSummary(
            supplier,
            documents
                .Select(document => new SupplierDocumentSnapshot(
                    SupplierDocumentMapper.ResolveStatus(document.ExpiresAtUtc, nowUtc),
                    document.Verdict))
                .ToList());

        var lastCompanyReview = await _context.CompanySuppliers
            .AsNoTracking()
            .Where(relation => relation.SupplierId == supplier.Id)
            .OrderByDescending(relation => relation.EvaluatedAtUtc)
            .Select(relation => new CompanySupplierSnapshot(
                relation.Status,
                relation.WarningMessage,
                null,
                relation.EvaluatedAtUtc))
            .FirstOrDefaultAsync(cancellationToken);

        if (lastCompanyReview != default)
        {
            SupplierSummaryBuilder.ApplyCompanySummary(supplier, lastCompanyReview);
        }

        return supplier;
    }
}
