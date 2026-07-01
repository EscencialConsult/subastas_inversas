namespace SICST.Application.Common.Interfaces;

public record ExternalComplianceRequest(
    string Cuit,
    string BusinessName,
    string Province,
    string Locality);

public record ExternalComplianceResult(
    bool Verified,
    string Provider,
    string Notes);

public interface IDgrTaxComplianceService
{
    Task<ExternalComplianceResult> VerifyAsync(
        ExternalComplianceRequest request,
        CancellationToken cancellationToken);
}

public interface IRepsalComplianceService
{
    Task<ExternalComplianceResult> VerifyAsync(
        ExternalComplianceRequest request,
        CancellationToken cancellationToken);
}
