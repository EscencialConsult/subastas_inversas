using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IArcaVerificationAuditStore
{
    Task RecordAsync(
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
        CancellationToken cancellationToken = default);
}
