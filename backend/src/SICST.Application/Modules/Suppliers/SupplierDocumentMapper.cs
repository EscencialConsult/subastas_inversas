using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers;

public static class SupplierDocumentMapper
{
    public const int DefaultExpiringSoonDays = 30;

    public static SupplierDocumentStatus ResolveStatus(
        DateTime expiresAtUtc,
        DateTime nowUtc,
        int daysAhead = DefaultExpiringSoonDays)
    {
        if (expiresAtUtc < nowUtc)
        {
            return SupplierDocumentStatus.Expired;
        }

        if (expiresAtUtc <= nowUtc.AddDays(daysAhead))
        {
            return SupplierDocumentStatus.ExpiringSoon;
        }

        return SupplierDocumentStatus.Valid;
    }

    public static SupplierDocumentDto ToDto(SupplierDocument document)
    {
        var reviews = document.Reviews
            .OrderBy(r => r.CreatedAtUtc)
            .Select(ToDto)
            .ToList();
        var verdict = reviews
            .LastOrDefault(r => r.Action == SupplierDocumentReviewAction.Verdict);

        return new SupplierDocumentDto
        {
            Id = document.Id,
            SupplierId = document.SupplierId,
            Type = document.Type,
            FileName = document.FileName,
            ContentType = document.ContentType,
            StoragePath = document.StoragePath,
            UploadedAtUtc = document.UploadedAtUtc,
            Sha256Hash = document.Sha256Hash,
            ExpiresAtUtc = document.ExpiresAtUtc,
            Status = document.Status,
            AlertSentAtUtc = document.AlertSentAtUtc,
            Verdict = verdict?.Verdict,
            VerdictIssuedAtUtc = verdict?.CreatedAtUtc,
            Reviews = reviews
        };
    }

    private static SupplierDocumentReviewDto ToDto(SupplierDocumentReview review)
    {
        return new SupplierDocumentReviewDto
        {
            Id = review.Id,
            SupplierDocumentId = review.SupplierDocumentId,
            ReviewerId = review.ReviewerId,
            Action = review.Action,
            Verdict = review.Verdict,
            Notes = review.Notes,
            ExceptionReason = review.ExceptionReason,
            CreatedAtUtc = review.CreatedAtUtc
        };
    }
}
