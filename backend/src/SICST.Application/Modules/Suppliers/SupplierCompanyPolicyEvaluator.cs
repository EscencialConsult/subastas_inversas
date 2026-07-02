using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers;

public static class SupplierCompanyPolicyEvaluator
{
    public static (CompanySupplierStatus Status, string? WarningMessage) Evaluate(
        IReadOnlyCollection<SupplierDocument> documents,
        bool strictPolicy,
        DateTime nowUtc)
    {
        foreach (var document in documents)
        {
            document.Status = SupplierDocumentMapper.ResolveStatus(document.ExpiresAtUtc, nowUtc);
        }

        var hasDocuments = documents.Count > 0;
        var hasExpiredDocuments = documents.Any(d => d.Status == SupplierDocumentStatus.Expired);
        var hasExpiringSoonDocuments = documents.Any(d => d.Status == SupplierDocumentStatus.ExpiringSoon);

        if (!hasDocuments)
        {
            return strictPolicy
                ? (CompanySupplierStatus.Blocked, "El proveedor no tiene documentacion global cargada.")
                : (CompanySupplierStatus.EnabledWithWarning, "El proveedor no tiene documentacion global cargada.");
        }

        if (hasExpiredDocuments)
        {
            return strictPolicy
                ? (CompanySupplierStatus.Blocked, "El proveedor tiene documentacion vencida.")
                : (CompanySupplierStatus.EnabledWithWarning, "El proveedor tiene documentacion vencida.");
        }

        if (hasExpiringSoonDocuments)
        {
            return strictPolicy
                ? (CompanySupplierStatus.Enabled, "El proveedor tiene documentacion proxima a vencer.")
                : (CompanySupplierStatus.EnabledWithWarning, "El proveedor tiene documentacion proxima a vencer.");
        }

        return (CompanySupplierStatus.Enabled, null);
    }
}
