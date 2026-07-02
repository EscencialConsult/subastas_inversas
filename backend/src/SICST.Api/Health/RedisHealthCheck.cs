using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace SICST.Api.Health;

public sealed class RedisHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;

    public RedisHealthCheck(IConfiguration configuration, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _serviceProvider = serviceProvider;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_configuration["Redis:ConnectionString"]))
        {
            return HealthCheckResult.Healthy("Redis is not configured; in-memory fallbacks are active.");
        }

        var redis = _serviceProvider.GetService<IConnectionMultiplexer>();
        if (redis == null || !redis.IsConnected)
        {
            return HealthCheckResult.Unhealthy("Redis connection is not available.");
        }

        var latency = await redis.GetDatabase().PingAsync();
        return HealthCheckResult.Healthy($"Redis responded in {latency.TotalMilliseconds} ms.");
    }
}
