using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;
using SICST.Application.Modules.Audit.Queries;
using SICST.Application.Modules.Auctions.Queries;
using SICST.Application.Modules.Purchases.Queries;
using SICST.Application.Modules.Suppliers.Queries;

namespace SICST.Application.Common.Behaviors;

public sealed class PerformanceBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private static readonly HashSet<string> CriticalRequestNames =
    [
        nameof(GetPurchaseProcessesQuery),
        nameof(GetPurchaseProcessByIdQuery),
        nameof(GetAuctionByPurchaseProcessQuery),
        nameof(GetAuctionByIdQuery),
        nameof(GetAuditEventsQuery),
        nameof(GetAccessLogsQuery),
        nameof(GetRiskAlertsQuery),
        nameof(GetRiskDashboardQuery),
        nameof(GetSuppliersQuery)
    ];

    private readonly ILogger<PerformanceBehavior<TRequest, TResponse>> _logger;

    public PerformanceBehavior(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        if (!CriticalRequestNames.Contains(requestName))
        {
            return await next(cancellationToken);
        }

        var stopwatch = Stopwatch.StartNew();
        try
        {
            return await next(cancellationToken);
        }
        finally
        {
            stopwatch.Stop();
            _logger.LogInformation(
                "Critical endpoint query {RequestName} completed in {ElapsedMilliseconds} ms",
                requestName,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
