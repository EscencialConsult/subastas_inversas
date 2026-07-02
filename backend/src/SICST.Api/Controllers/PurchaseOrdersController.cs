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
public class PurchaseOrdersController : ControllerBase
{
    private readonly ISender _sender;

    public PurchaseOrdersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("api/v1/companies/{companyId:guid}/contracts/{contractId:guid}/purchase-order")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseOrderDto>> IssuePurchaseOrder(Guid companyId, Guid contractId, [FromBody] IssuePurchaseOrderCommand command)
    {
        if (companyId != command.CompanyId || contractId != command.ContractId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var order = await _sender.Send(command);
        return order == null ? NotFound(new { message = "Contrato no encontrado." }) : Ok(order);
    }

    [HttpGet("api/v1/companies/{companyId:guid}/purchase-orders/{purchaseOrderId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetPurchaseOrderPdf(Guid companyId, Guid purchaseOrderId)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var order = processes.Items.Select(p => p.PurchaseOrder).FirstOrDefault(o => o?.Id == purchaseOrderId);
        if (order == null)
        {
            return NotFound(new { message = "Orden de compra no encontrada." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "purchase-orders", $"{purchaseOrderId}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico de la orden no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Orden-Compra-{order.Number}.pdf");
    }
}
