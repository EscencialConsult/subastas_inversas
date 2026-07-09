using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;

namespace SICST.Infrastructure.Arca;

public class ArcaVerificationService : IArcaVerificationService
{
    private readonly PadronA5Client _padronA5Client;
    private readonly ILogger<ArcaVerificationService> _logger;

    private const int FuzzyMatchThreshold = 85;
    private const int ManualReviewThreshold = 70;

    public ArcaVerificationService(PadronA5Client padronA5Client, ILogger<ArcaVerificationService> logger)
    {
        _padronA5Client = padronA5Client;
        _logger = logger;
    }

    public async Task<ArcaVerificationResult> VerifySupplierAsync(ArcaVerificationRequest request, CancellationToken ct)
    {
        var cuitDigits = new string(request.Cuit.Where(char.IsDigit).ToArray());

        if (cuitDigits.Length != 11 || !long.TryParse(cuitDigits, out var cuitNumber))
        {
            return new ArcaVerificationResult(false, "El CUIT informado no tiene un formato válido.");
        }

        try
        {
            var taxpayer = await _padronA5Client.GetPersonaAsync(cuitNumber, ct);

            if (!taxpayer.Found)
            {
                return new ArcaVerificationResult(false, taxpayer.MensajeError ?? "CUIT no encontrado en el padrón de ARCA.")
                {
                    TaxpayerData = taxpayer
                };
            }

            if (taxpayer.KeyStatus != "ACTIVO")
            {
                return new ArcaVerificationResult(false, $"ARCA informa que el CUIT no está activo (estado: {taxpayer.KeyStatus}).")
                {
                    TaxpayerData = taxpayer
                };
            }

            var (match, score) = BusinessNameMatches(request.BusinessName, taxpayer);

            if (!match)
            {
                if (score >= ManualReviewThreshold)
                {
                    return new ArcaVerificationResult(
                        true,
                        "La razón social declarada no coincide exactamente con la registrada en ARCA. Se requiere revisión manual.")
                    {
                        TaxpayerData = taxpayer,
                        BusinessNameMatchScore = score,
                        RequiresManualReview = true
                    };
                }

                return new ArcaVerificationResult(
                    true,
                    $"CUIT válido, pero la razón social declarada difiere de la registrada en ARCA (coincidencia: {score}%). Se requiere revisión manual.")
                {
                    TaxpayerData = taxpayer,
                    BusinessNameMatchScore = score
                };
            }

            return new ArcaVerificationResult(true, "Situación fiscal verificada: CUIT activo y datos coinciden con ARCA.")
            {
                TaxpayerData = taxpayer,
                BusinessNameMatchScore = score
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error de conexión al consultar ARCA para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, "No se pudo consultar ARCA. Verificá la conectividad e intentá de nuevo más tarde.");
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Timeout al consultar ARCA para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, "La consulta a ARCA superó el tiempo de espera. Reintentá más tarde.");
        }
        catch (FileNotFoundException ex)
        {
            _logger.LogError(ex, "No se encontró el certificado ARCA para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, "No se encontró el certificado configurado para consultar ARCA.");
        }
        catch (DirectoryNotFoundException ex)
        {
            _logger.LogError(ex, "No se encontró la carpeta del certificado ARCA para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, "No se encontró la carpeta del certificado configurado para consultar ARCA.");
        }
        catch (CryptographicException ex)
        {
            _logger.LogError(ex, "No se pudo leer el certificado ARCA para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, "No se pudo leer el certificado ARCA. Revisá la contraseña y el archivo .p12.");
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("ARCA WSAA", StringComparison.Ordinal))
        {
            _logger.LogError(ex, "ARCA WSAA rechazó la autenticación para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, ex.Message);
        }
        catch (InvalidOperationException ex) when (ex.Message.StartsWith("ARCA Padr", StringComparison.Ordinal))
        {
            _logger.LogError(ex, "ARCA Padrón rechazó la consulta para CUIT {Cuit}", request.Cuit);
            return new ArcaVerificationResult(false, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado al verificar CUIT {Cuit} en ARCA", request.Cuit);
            return new ArcaVerificationResult(false, "Ocurrió un error inesperado al verificar los datos en ARCA.");
        }
    }

    private static (bool match, int score) BusinessNameMatches(string declaredName, ArcaTaxpayerData taxpayer)
    {
        if (string.IsNullOrWhiteSpace(declaredName))
            return (false, 0);

        var declared = Normalize(declaredName);
        var candidates = new List<string>();

        if (!string.IsNullOrWhiteSpace(taxpayer.BusinessName))
        {
            candidates.Add(Normalize(taxpayer.BusinessName));
        }

        if (!string.IsNullOrWhiteSpace(taxpayer.LastName) && !string.IsNullOrWhiteSpace(taxpayer.FirstName))
        {
            candidates.Add(Normalize($"{taxpayer.LastName}, {taxpayer.FirstName}"));
            candidates.Add(Normalize($"{taxpayer.LastName} {taxpayer.FirstName}"));
        }

        if (!string.IsNullOrWhiteSpace(taxpayer.LastName))
        {
            candidates.Add(Normalize(taxpayer.LastName));
        }

        candidates = candidates.Distinct().ToList();

        var bestScore = 0;
        foreach (var candidate in candidates)
        {
            if (declared == candidate)
            {
                return (true, 100);
            }

            if (declared.Contains(candidate) || candidate.Contains(declared))
            {
                return (true, 95);
            }

            var distance = LevenshteinDistance(declared, candidate);
            var maxLen = Math.Max(declared.Length, candidate.Length);
            var score = maxLen > 0 ? (int)Math.Round((1.0 - (double)distance / maxLen) * 100) : 0;
            if (score > bestScore)
            {
                bestScore = score;
            }
        }

        if (bestScore >= FuzzyMatchThreshold)
        {
            return (true, bestScore);
        }

        return (false, bestScore);
    }

    private static string Normalize(string value)
    {
        return value
            .ToUpperInvariant()
            .Replace(".", "")
            .Replace(",", "")
            .Replace("-", "")
            .Replace("/", "")
            .Replace("  ", " ")
            .Trim();
    }

    internal static int LevenshteinDistance(string a, string b)
    {
        var m = a.Length;
        var n = b.Length;
        var d = new int[m + 1, n + 1];

        for (var i = 0; i <= m; i++) d[i, 0] = i;
        for (var j = 0; j <= n; j++) d[0, j] = j;

        for (var j = 1; j <= n; j++)
        {
            for (var i = 1; i <= m; i++)
            {
                var cost = a[i - 1] == b[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }

        return d[m, n];
    }
}
