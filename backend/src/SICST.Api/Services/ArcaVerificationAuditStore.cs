using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Api.Services;

public class ArcaVerificationAuditStore : IArcaVerificationAuditStore
{
    private readonly ApplicationDbContext _context;

    public ArcaVerificationAuditStore(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task RecordAsync(
        Guid supplierId,
        ArcaVerificationStatus result,
        string notes,
        string source,
        int? businessNameMatchScore,
        bool automatic,
        string? cuitConsulted = null,
        string? businessNameDeclared = null,
        string? businessNameFoundInArca = null,
        string? rawResponseSummary = null,
        Guid? reviewedByUserId = null,
        CancellationToken cancellationToken = default)
    {
        _context.Set<ArcaVerificationAudit>().Add(new ArcaVerificationAudit
        {
            Id = Guid.NewGuid(),
            SupplierId = supplierId,
            Result = result,
            Notes = notes,
            Source = source,
            BusinessNameMatchScore = businessNameMatchScore,
            Automatic = automatic,
            CuitConsulted = cuitConsulted,
            BusinessNameDeclared = businessNameDeclared,
            BusinessNameFoundInArca = businessNameFoundInArca,
            RawResponseSummary = rawResponseSummary,
            ReviewedByUserId = reviewedByUserId,
            CreatedAtUtc = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
    }
}
