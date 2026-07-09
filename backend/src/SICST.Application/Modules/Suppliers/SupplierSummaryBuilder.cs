using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers;

public readonly record struct SupplierDocumentSnapshot(
    SupplierDocumentStatus Status,
    SupplierDocumentVerdict? Verdict);

public readonly record struct CompanySupplierSnapshot(
    CompanySupplierStatus? Status,
    string? WarningMessage,
    bool? StrictPolicyApplied,
    DateTime? EvaluatedAtUtc);

public static class SupplierSummaryBuilder
{
    public static void ApplyDocumentSummary(
        SupplierDto supplier,
        IReadOnlyCollection<SupplierDocumentSnapshot> documents)
    {
        supplier.DocumentsTotal = documents.Count;
        supplier.DocumentsApproved = documents.Count(d =>
            d.Verdict is SupplierDocumentVerdict.Approved or SupplierDocumentVerdict.ApprovedWithException);
        supplier.DocumentsRejected = documents.Count(d => d.Verdict == SupplierDocumentVerdict.Rejected);
        supplier.DocumentsExpired = documents.Count(d => d.Status == SupplierDocumentStatus.Expired);
        supplier.DocumentsPendingReview = documents.Count(d => d.Verdict is null);
        supplier.ReadinessStatus = CalculateReadiness(supplier, documents);
    }

    public static void ApplyCompanySummary(
        SupplierDto supplier,
        CompanySupplierSnapshot snapshot)
    {
        supplier.CompanySupplierStatus = snapshot.Status;
        supplier.CompanySupplierWarning = snapshot.WarningMessage;
        supplier.CompanySupplierStrictPolicy = snapshot.StrictPolicyApplied;
        supplier.LastCompanyReviewAtUtc = snapshot.EvaluatedAtUtc;
        supplier.LastCompanyReviewNotes = snapshot.WarningMessage;
    }

    public static CompanySupplierSnapshot EmptyCompanySummary()
    {
        return new CompanySupplierSnapshot(null, null, null, null);
    }

    private static SupplierReadinessStatus CalculateReadiness(
        SupplierDto supplier,
        IReadOnlyCollection<SupplierDocumentSnapshot> documents)
    {
        if (!supplier.ArcaVerified || supplier.ArcaVerificationStatus != ArcaVerificationStatus.Verified)
        {
            return SupplierReadinessStatus.Blocked;
        }

        if (supplier.Status == SupplierStatus.Rejected)
        {
            return SupplierReadinessStatus.Blocked;
        }

        if (documents.Count == 0)
        {
            return SupplierReadinessStatus.Blocked;
        }

        if (documents.Any(d => d.Status == SupplierDocumentStatus.Expired))
        {
            return SupplierReadinessStatus.Blocked;
        }

        if (documents.Any(d => d.Verdict == SupplierDocumentVerdict.Rejected))
        {
            return SupplierReadinessStatus.Blocked;
        }

        if (supplier.Status != SupplierStatus.Verified)
        {
            return SupplierReadinessStatus.NeedsReview;
        }

        if (documents.Any(d => d.Status == SupplierDocumentStatus.ExpiringSoon))
        {
            return SupplierReadinessStatus.NeedsReview;
        }

        if (documents.Any(d => d.Verdict is null))
        {
            return SupplierReadinessStatus.NeedsReview;
        }

        return SupplierReadinessStatus.Ready;
    }
}
