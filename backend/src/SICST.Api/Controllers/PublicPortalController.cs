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

    [HttpGet("open-data/processes.json")]
    public async Task<ActionResult<List<PublicPurchaseProcessDto>>> GetOpenDataProcessesJson(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search)
    {
        var processes = await _sender.Send(new GetPublicPurchaseProcessesQuery(companyId, search));
        return Ok(processes);
    }

    [HttpGet("open-data/processes.csv")]
    public async Task<IActionResult> GetOpenDataProcessesCsv(
        [FromQuery] Guid? companyId,
        [FromQuery] string? stage)
    {
        var export = await _sender.Send(new ExportPublicOpenDataCsvQuery(companyId, stage));
        return File(
            System.Text.Encoding.UTF8.GetBytes(export.CsvContent),
            export.ContentType,
            export.FileName);
    }

    [HttpGet("ocds/releases")]
    public async Task<ActionResult<OcdsReleasePackageDto>> GetOcdsReleases(
        [FromQuery] Guid? companyId,
        [FromQuery] string? stage)
    {
        var package = await _sender.Send(new GetPublicOcdsReleasesQuery(companyId, stage));
        return Ok(package);
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}")]
    public async Task<ActionResult<PublicPurchaseProcessDetailDto>> GetProcessDetail(Guid purchaseProcessId)
    {
        var process = await _sender.Send(new GetPublicPurchaseProcessDetailQuery(purchaseProcessId));
        if (process == null)
        {
            return NotFound(new { message = "Proceso publico no encontrado." });
        }

        return Ok(process);
    }

    [HttpGet("awards")]
    public async Task<ActionResult<List<PublicAwardDto>>> GetAwards(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search)
    {
        var awards = await _sender.Send(new GetPublicAwardsQuery(companyId, search));
        return Ok(awards);
    }

    [HttpGet("auctions")]
    public async Task<ActionResult<List<PublicAuctionDto>>> GetAuctions([FromQuery] Guid? companyId)
    {
        var auctions = await _sender.Send(new GetPublicAuctionsQuery(companyId));
        return Ok(auctions);
    }

    [HttpGet("auctions/live")]
    public async Task<ActionResult<List<PublicAuctionDto>>> GetLiveAuctions([FromQuery] Guid? companyId)
    {
        var auctions = await _sender.Send(new GetPublicLiveAuctionsQuery(companyId));
        return Ok(auctions);
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}/auction")]
    public async Task<ActionResult<PublicAuctionDto>> GetAuctionByPurchaseProcess(Guid purchaseProcessId)
    {
        var auction = await _sender.Send(new GetPublicAuctionByPurchaseProcessQuery(purchaseProcessId));
        if (auction == null)
        {
            return NotFound(new { message = "Subasta publica no encontrada para este proceso." });
        }

        return Ok(auction);
    }
}
