using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Audit.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Audit.Queries;

public record GetRiskDashboardQuery(Guid? CompanyId = null) : IRequest<RiskDashboardDto>;

public class GetRiskDashboardQueryHandler : IRequestHandler<GetRiskDashboardQuery, RiskDashboardDto>
{
    private readonly IApplicationDbContext _context;

    public GetRiskDashboardQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RiskDashboardDto> Handle(GetRiskDashboardQuery request, CancellationToken cancellationToken)
    {
        var alerts = await new GetRiskAlertsQueryHandler(_context)
            .Handle(new GetRiskAlertsQuery(request.CompanyId, Limit: 1000), cancellationToken);

        var integrity = await new VerifyIntegrityQueryHandler(_context)
            .Handle(new VerifyIntegrityQuery(request.CompanyId), cancellationToken);

        var processQuery = _context.PurchaseProcesses.AsQueryable();
        var auctionQuery = _context.Auctions.AsQueryable();
        if (request.CompanyId.HasValue)
        {
            processQuery = processQuery.Where(p => p.CompanyId == request.CompanyId.Value);
            auctionQuery = auctionQuery.Where(a => a.CompanyId == request.CompanyId.Value);
        }

        var topRiskProcesses = alerts
            .GroupBy(a => new { a.PurchaseProcessId, a.ProcessCode, a.ProcessTitle })
            .Select(group => new RiskDashboardProcessDto
            {
                PurchaseProcessId = group.Key.PurchaseProcessId,
                ProcessCode = group.Key.ProcessCode,
                ProcessTitle = group.Key.ProcessTitle,
                AlertsCount = group.Count(),
                HighRiskAlerts = group.Count(a => a.Severity == "high"),
                MediumRiskAlerts = group.Count(a => a.Severity == "medium"),
                InfoRiskAlerts = group.Count(a => a.Severity == "info")
            })
            .OrderByDescending(p => p.HighRiskAlerts)
            .ThenByDescending(p => p.MediumRiskAlerts)
            .ThenByDescending(p => p.AlertsCount)
            .Take(10)
            .ToList();

        return new RiskDashboardDto
        {
            GeneratedAtUtc = DateTime.UtcNow,
            TotalProcesses = await processQuery.CountAsync(cancellationToken),
            TotalAuctions = await auctionQuery.CountAsync(cancellationToken),
            TotalAlerts = alerts.Count,
            HighRiskAlerts = alerts.Count(a => a.Severity == "high"),
            MediumRiskAlerts = alerts.Count(a => a.Severity == "medium"),
            InfoRiskAlerts = alerts.Count(a => a.Severity == "info"),
            ProcessesWithAlerts = alerts.Select(a => a.PurchaseProcessId).Distinct().Count(),
            IntegrityIsValid = integrity.IsValid,
            IntegrityFindings = integrity.Findings.Count,
            TopRiskProcesses = topRiskProcesses
        };
    }
}
