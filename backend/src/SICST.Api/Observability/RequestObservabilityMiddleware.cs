using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace SICST.Api.Observability;

public sealed class RequestObservabilityMiddleware
{
    public const string TraceIdHeaderName = "X-Trace-Id";

    private static readonly Meter Meter = new("SICST.Api");
    private static readonly Counter<long> RequestCounter = Meter.CreateCounter<long>("sicst.http.server.requests");
    private static readonly Histogram<double> RequestDuration = Meter.CreateHistogram<double>("sicst.http.server.duration.ms");

    private readonly RequestDelegate _next;
    private readonly ILogger<RequestObservabilityMiddleware> _logger;

    public RequestObservabilityMiddleware(
        RequestDelegate next,
        ILogger<RequestObservabilityMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = GetTraceId(context);
        context.Response.Headers[TraceIdHeaderName] = traceId;
        Activity.Current?.SetTag("sicst.trace_id", traceId);

        var stopwatch = Stopwatch.StartNew();
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["TraceId"] = traceId,
            ["Path"] = context.Request.Path.Value ?? string.Empty,
            ["Method"] = context.Request.Method
        }))
        {
            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                var endpoint = context.GetEndpoint()?.DisplayName ?? context.Request.Path.Value ?? "unknown";
                var tags = new TagList
                {
                    { "method", context.Request.Method },
                    { "endpoint", endpoint },
                    { "status_code", context.Response.StatusCode }
                };

                RequestCounter.Add(1, tags);
                RequestDuration.Record(stopwatch.Elapsed.TotalMilliseconds, tags);

                _logger.LogInformation(
                    "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMilliseconds} ms",
                    context.Request.Method,
                    context.Request.Path,
                    context.Response.StatusCode,
                    stopwatch.Elapsed.TotalMilliseconds);
            }
        }
    }

    private static string GetTraceId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(TraceIdHeaderName, out var existing)
            && !string.IsNullOrWhiteSpace(existing))
        {
            return existing.ToString();
        }

        return Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
    }
}
