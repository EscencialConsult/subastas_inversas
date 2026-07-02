using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Purchases.Commands;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Application.Modules.Purchases.Queries;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
public class ReceptionsController : ControllerBase
{
    private readonly ISender _sender;

    public ReceptionsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("api/v1/companies/{companyId:guid}/purchase-orders/{purchaseOrderId:guid}/receptions")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ReceptionConfirmationDto>> ConfirmReception(Guid companyId, Guid purchaseOrderId, [FromBody] ConfirmReceptionCommand command)
    {
        if (companyId != command.CompanyId || purchaseOrderId != command.PurchaseOrderId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var reception = await _sender.Send(command);
        return reception == null ? NotFound(new { message = "Orden de compra no encontrada." }) : Ok(reception);
    }

    [HttpGet("api/v1/companies/{companyId:guid}/receptions/{receptionId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetReceptionPdf(Guid companyId, Guid receptionId)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var reception = processes.Items
            .Select(p => p.PurchaseOrder)
            .Where(o => o != null)
            .SelectMany(o => o!.Receptions)
            .FirstOrDefault(r => r.Id == receptionId);

        if (reception == null)
        {
            return NotFound(new { message = "Confirmacion de recepcion no encontrada." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "receptions", $"{receptionId}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico de la recepcion no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Recepcion-{reception.ReceivedAtUtc:yyyyMMdd}.pdf");
    }
}
