using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Modules.Audit.DTOs;
using SICST.Application.Modules.Audit.Queries;
using SICST.Application.Common.Security;
using SICST.Domain.Entities;

namespace SICST.Api.Controllers;

[Authorize(Policy = PermissionCodes.AuditRead)]
[ApiController]
[Route("audit/events")]
public class AuditController : ControllerBase
{
    private readonly ISender _sender;

    public AuditController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    public async Task<ActionResult<List<AuditEventDto>>> GetEvents(
        [FromQuery] Guid? companyId,
        [FromQuery] string? entityName,
        [FromQuery] AuditEventAction? action,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int limit = 200)
    {
        var events = await _sender.Send(new GetAuditEventsQuery(
            companyId,
            entityName,
            action,
            fromUtc,
            toUtc,
            limit));

        return Ok(events);
    }

    [HttpGet("access-logs")]
    public async Task<ActionResult<List<AccessLogDto>>> GetAccessLogs(
        [FromQuery] Guid? companyId,
        [FromQuery] string? email,
        [FromQuery] AccessLogEventType? eventType,
        [FromQuery] bool? success,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int limit = 200)
    {
        var events = await _sender.Send(new GetAccessLogsQuery(
            companyId,
            email,
            eventType,
            success,
            fromUtc,
            toUtc,
            limit));

        return Ok(events);
    }

    [HttpGet("risk-alerts")]
    public async Task<ActionResult<List<RiskAlertDto>>> GetRiskAlerts(
        [FromQuery] Guid? companyId,
        [FromQuery] Guid? purchaseProcessId,
        [FromQuery] string? severity,
        [FromQuery] int limit = 200)
    {
        var alerts = await _sender.Send(new GetRiskAlertsQuery(
            companyId,
            purchaseProcessId,
            severity,
            limit));

        return Ok(alerts);
    }

    [HttpGet("integrity")]
    public async Task<ActionResult<IntegrityVerificationDto>> VerifyIntegrity([FromQuery] Guid? companyId)
    {
        var result = await _sender.Send(new VerifyIntegrityQuery(companyId));
        return Ok(result);
    }

    [HttpGet("risk-dashboard")]
    public async Task<ActionResult<RiskDashboardDto>> GetRiskDashboard([FromQuery] Guid? companyId)
    {
        var dashboard = await _sender.Send(new GetRiskDashboardQuery(companyId));
        return Ok(dashboard);
    }

    [HttpGet("export/signed-csv")]
    public async Task<ActionResult<SignedAuditCsvExportDto>> ExportSignedCsv([FromQuery] Guid? companyId)
    {
        var export = await _sender.Send(new ExportSignedAuditCsvQuery(companyId));
        return Ok(export);
    }
}
