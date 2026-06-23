using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Public.DTOs;
using SICST.Application.Public.Queries;

namespace SICST.Api.Controllers;

[AllowAnonymous]
[ApiController]
[Route("api/public")]
public class PublicPortalController : ControllerBase
{
    private readonly ISender _sender;

    public PublicPortalController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet("purchase-processes")]
    public async Task<ActionResult<List<PublicPurchaseProcessDto>>> GetProcesses(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search)
    {
        var processes = await _sender.Send(new GetPublicPurchaseProcessesQuery(companyId, search));
        return Ok(processes);
    }

    [HttpGet("awards")]
    public async Task<ActionResult<List<PublicAwardDto>>> GetAwards(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search)
    {
        var awards = await _sender.Send(new GetPublicAwardsQuery(companyId, search));
        return Ok(awards);
    }

    [HttpGet("auctions/live")]
    public async Task<ActionResult<List<PublicAuctionDto>>> GetLiveAuctions([FromQuery] Guid? companyId)
    {
        var auctions = await _sender.Send(new GetPublicLiveAuctionsQuery(companyId));
        return Ok(auctions);
    }
}
