using SICST.Application.Common.Models;

namespace SICST.Application.Common.Interfaces;

public record ArcaVerificationRequest(
    string Cuit,
    string BusinessName,
    string Email,
    string Province,
    string Locality);

public record ArcaVerificationResult(
    bool Verified,
    string Notes)
{
    public ArcaTaxpayerData? TaxpayerData { get; init; }

    public int? BusinessNameMatchScore { get; init; }

    public bool RequiresManualReview { get; init; }
}

public interface IArcaVerificationService
{
    Task<ArcaVerificationResult> VerifySupplierAsync(ArcaVerificationRequest request, CancellationToken cancellationToken);
}
