using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Audit.DTOs;
using SICST.Application.Audit.Queries;
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
}
