using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace SICST.Api.Health;

public sealed class StorageHealthCheck : IHealthCheck
{
    private readonly IWebHostEnvironment _environment;

    public StorageHealthCheck(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads");
        try
        {
            Directory.CreateDirectory(uploadsPath);
            var probePath = Path.Combine(uploadsPath, ".health");
            File.WriteAllText(probePath, DateTime.UtcNow.ToString("O"));
            File.Delete(probePath);
            return Task.FromResult(HealthCheckResult.Healthy("Upload storage is writable."));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("Upload storage is not writable.", ex));
        }
    }
}
