using Microsoft.Extensions.Diagnostics.HealthChecks;
using SICST.Api.Services;

namespace SICST.Api.Health;

public sealed class AntivirusHealthCheck : IHealthCheck
{
    private readonly IAntivirusScanner _scanner;

    public AntivirusHealthCheck(IAntivirusScanner scanner)
    {
        _scanner = scanner;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var probePath = Path.Combine(Path.GetTempPath(), $"sicst-av-{Guid.NewGuid():N}.txt");
        try
        {
            await File.WriteAllTextAsync(probePath, "health-check", cancellationToken);
            var result = await _scanner.ScanAsync(probePath, cancellationToken);
            return result.IsClean
                ? HealthCheckResult.Healthy("Antivirus scanner is available.")
                : HealthCheckResult.Unhealthy(result.Message ?? "Antivirus scanner rejected the health probe.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Antivirus scanner failed.", ex);
        }
        finally
        {
            if (File.Exists(probePath))
            {
                File.Delete(probePath);
            }
        }
    }
}
