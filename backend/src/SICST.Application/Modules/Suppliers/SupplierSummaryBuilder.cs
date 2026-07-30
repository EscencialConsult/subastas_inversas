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
        // El ÚNICO bloqueo duro es la verificación fiscal de ARCA. Sin ARCA verificado, el
        // proveedor no puede operar en ningún lado.
        if (!supplier.ArcaVerified || supplier.ArcaVerificationStatus != ArcaVerificationStatus.Verified)
        {
            return SupplierReadinessStatus.Blocked;
        }

        // Ya verificado por ARCA: el proveedor está vigente. Los problemas de documentación
        // se muestran como ADVERTENCIA (NeedsReview), no como bloqueo. La habilitación real
        // para operar la decide cada empresa por separado.
        if (documents.Count == 0)
        {
            return SupplierReadinessStatus.NeedsReview;
        }

        if (documents.Any(d => d.Status == SupplierDocumentStatus.Expired))
        {
            return SupplierReadinessStatus.NeedsReview;
        }

        if (documents.Any(d => d.Verdict == SupplierDocumentVerdict.Rejected))
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
