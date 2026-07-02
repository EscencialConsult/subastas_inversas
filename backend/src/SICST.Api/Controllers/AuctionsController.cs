using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SICST.Api.Hubs;
using SICST.Application.Modules.Auctions.Commands;
using SICST.Application.Modules.Auctions.DTOs;
using SICST.Application.Modules.Auctions.Queries;
using SICST.Application.Common.Security;
using SICST.Application.Public.Queries;
using SICST.Domain.Entities;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/companies/{companyId:guid}")]
public class AuctionsController : ControllerBase
{
    private readonly ISender _sender;
    private readonly IHubContext<AuctionHub> _hubContext;

    public AuctionsController(ISender sender, IHubContext<AuctionHub> hubContext)
    {
        _sender = sender;
        _hubContext = hubContext;
    }

    [HttpPost("purchase-processes/{purchaseProcessId:guid}/auction/start")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<AuctionDto>> Start(Guid companyId, Guid purchaseProcessId, [FromBody] StartAuctionCommand command)
    {
        if (companyId != command.CompanyId || purchaseProcessId != command.PurchaseProcessId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var auction = await _sender.Send(command);
            if (auction.Status == AuctionStatus.Open)
            {
                await _hubContext.Clients.Group(AuctionHub.GroupName(auction.Id)).SendAsync("AuctionOpened", auction);
            }
            else if (auction.Status == AuctionStatus.Scheduled)
            {
                await _hubContext.Clients.Group(AuctionHub.GroupName(auction.Id)).SendAsync("AuctionScheduled", auction);
            }
            await _hubContext.Clients.Group(AuctionHub.GroupName(auction.Id)).SendAsync("AuctionUpdated", auction);
            return Ok(auction);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}/auction")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<AuctionDto>> GetByPurchaseProcess(Guid companyId, Guid purchaseProcessId)
    {
        var auction = await _sender.Send(new GetAuctionByPurchaseProcessQuery(companyId, purchaseProcessId));
        if (auction == null)
        {
            return NotFound(new { message = "Esta subasta no existe." });
        }

        return Ok(auction);
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}/auction/approval")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<AuctionDto>> GetByPurchaseProcessForApproval(Guid companyId, Guid purchaseProcessId)
    {
        var auction = await _sender.Send(new GetAuctionByPurchaseProcessQuery(companyId, purchaseProcessId));
        if (auction == null)
        {
            return NotFound(new { message = "Esta subasta no existe." });
        }

        return Ok(auction);
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}/auction/audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<AuctionDto>> GetByPurchaseProcessForAudit(Guid companyId, Guid purchaseProcessId)
    {
        var auction = await _sender.Send(new GetAuctionByPurchaseProcessQuery(companyId, purchaseProcessId));
        if (auction == null)
        {
            return NotFound(new { message = "Esta subasta no existe." });
        }

        return Ok(auction);
    }

    [HttpGet("purchase-processes/{purchaseProcessId:guid}/auction/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<AuctionDto>> GetByPurchaseProcessForEvaluation(Guid companyId, Guid purchaseProcessId)
    {
        var auction = await _sender.Send(new GetAuctionByPurchaseProcessQuery(companyId, purchaseProcessId));
        if (auction == null)
        {
            return NotFound(new { message = "Esta subasta no existe." });
        }

        return Ok(auction);
    }

    [HttpPost("auctions/{auctionId:guid}/bids")]
    [Authorize]
    public async Task<ActionResult<BidDto>> PlaceBid(Guid auctionId, [FromBody] PlaceBidCommand command)
    {
        if (auctionId != command.AuctionId)
        {
            return BadRequest(new { message = "El ID de subasta de la URL no coincide con el cuerpo." });
        }

        try
        {
            var bid = await _sender.Send(command);
            await _hubContext.Clients.Group(AuctionHub.GroupName(auctionId)).SendAsync("BidPlaced", bid);
            return Ok(bid);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("auctions/{auctionId:guid}/close")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<AuctionDto>> Close(Guid companyId, Guid auctionId)
    {
        try
        {
            var auction = await _sender.Send(new CloseAuctionCommand(companyId, auctionId));
            if (auction == null)
            {
                return NotFound(new { message = "Subasta no encontrada." });
            }

            await _hubContext.Clients.Group(AuctionHub.GroupName(auctionId)).SendAsync("AuctionClosed", auction);
            return Ok(auction);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("auctions/{auctionId:guid}/closing-act/pdf")]
    [Authorize]
    public async Task<IActionResult> GetClosingActPdf(Guid companyId, Guid auctionId)
    {
        var auction = await _sender.Send(new GetAuctionByIdQuery(auctionId));
        if (auction == null || auction.CompanyId != companyId || string.IsNullOrWhiteSpace(auction.ClosingActUrl))
        {
            return NotFound(new { message = "El acta de cierre no esta disponible para esta subasta." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "auction-closing-acts", $"{auctionId}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico del acta no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Acta-Cierre-Subasta-{auctionId}.pdf");
    }
}

[ApiController]
[Route("api/public/auctions")]
public class PublicAuctionsController : ControllerBase
{
    private static readonly JsonSerializerOptions EventJsonOptions = new(JsonSerializerDefaults.Web);
    private readonly ISender _sender;

    public PublicAuctionsController(ISender sender)
    {
        _sender = sender;
    }

    [AllowAnonymous]
    [HttpGet("{auctionId:guid}/events")]
    public async Task StreamAuction(Guid auctionId, CancellationToken cancellationToken)
    {
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";

        while (!cancellationToken.IsCancellationRequested)
        {
            var snapshot = await _sender.Send(new GetPublicAuctionSnapshotQuery(auctionId), cancellationToken);
            if (snapshot == null)
            {
                Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            var payload = JsonSerializer.Serialize(snapshot, EventJsonOptions);
            await Response.WriteAsync($"event: auction\n", cancellationToken);
            await Response.WriteAsync($"data: {payload}\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);

            if (snapshot.Status == Domain.Entities.AuctionStatus.Closed)
            {
                return;
            }

            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }
    }
}
