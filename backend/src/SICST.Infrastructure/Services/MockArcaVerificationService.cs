using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Services;

public class MockArcaVerificationService : IArcaVerificationService
{
    public Task<ArcaVerificationResult> VerifySupplierAsync(
        ArcaVerificationRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsValidCuit(request.Cuit))
        {
            return Task.FromResult(new ArcaVerificationResult(false, "ARCA rechazó el CUIT informado."));
        }

        if (request.Cuit.EndsWith("-0", StringComparison.Ordinal))
        {
            return Task.FromResult(new ArcaVerificationResult(false, "ARCA informó que el CUIT no está activo."));
        }

        if (string.IsNullOrWhiteSpace(request.BusinessName))
        {
            return Task.FromResult(new ArcaVerificationResult(false, "ARCA no pudo validar la razón social."));
        }

        return Task.FromResult(new ArcaVerificationResult(true, "Datos fiscales verificados correctamente por ARCA."));
    }

    private static bool IsValidCuit(string cuit)
    {
        var digits = new string(cuit.Where(char.IsDigit).ToArray());
        if (digits.Length != 11) return false;

        int[] multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
        var sum = 0;
        for (var i = 0; i < 10; i++)
        {
            sum += (digits[i] - '0') * multipliers[i];
        }

        var remainder = sum % 11;
        var checkDigit = digits[10] - '0';
        var calculatedDigit = 11 - remainder;

        if (calculatedDigit == 11) calculatedDigit = 0;
        else if (calculatedDigit == 10) calculatedDigit = 9;

        return checkDigit == calculatedDigit;
    }
}
