using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Services;

public class MockDgrTaxComplianceService : IDgrTaxComplianceService
{
    public Task<ExternalComplianceResult> VerifyAsync(
        ExternalComplianceRequest request,
        CancellationToken cancellationToken)
    {
        var cuitDigits = new string(request.Cuit.Where(char.IsDigit).ToArray());
        if (cuitDigits.EndsWith('9'))
        {
            return Task.FromResult(new ExternalComplianceResult(
                false,
                "DGR",
                "DGR informa deuda fiscal provincial vigente."));
        }

        return Task.FromResult(new ExternalComplianceResult(
            true,
            "DGR",
            "DGR informa cumplimiento fiscal provincial vigente."));
    }
}

public class MockRepsalComplianceService : IRepsalComplianceService
{
    public Task<ExternalComplianceResult> VerifyAsync(
        ExternalComplianceRequest request,
        CancellationToken cancellationToken)
    {
        var cuitDigits = new string(request.Cuit.Where(char.IsDigit).ToArray());
        var normalizedName = request.BusinessName.ToLowerInvariant();
        if (cuitDigits.EndsWith('7') || normalizedName.Contains("repsal") || normalizedName.Contains("sancion"))
        {
            return Task.FromResult(new ExternalComplianceResult(
                false,
                "REPSAL",
                "REPSAL informa sancion laboral vigente."));
        }

        return Task.FromResult(new ExternalComplianceResult(
            true,
            "REPSAL",
            "REPSAL no registra sanciones laborales vigentes."));
    }
}
