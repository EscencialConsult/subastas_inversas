using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Purchases.Commands;
using SICST.Application.Purchases.DTOs;
using SICST.Application.Purchases.Queries;
using SICST.Domain.Entities;
using SICST.Application.Common.Models;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/companies/{companyId:guid}/purchase-processes")]
public class PurchaseProcessesController : ControllerBase
{
    private readonly ISender _sender;

    public PurchaseProcessesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PagedResult<PurchaseProcessDto>>> GetAll(
        Guid companyId,
        [FromQuery] string? search,
        [FromQuery] PurchaseProcessStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, search, status, pageNumber, pageSize));
        return Ok(processes);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> GetById(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        if (process == null)
        {
            return NotFound(new { message = "Proceso de compra no encontrado." });
        }

        return Ok(process);
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Create(Guid companyId, [FromBody] CreatePurchaseProcessCommand command)
    {
        if (companyId != command.CompanyId)
        {
            return BadRequest(new { message = "El ID de empresa de la URL no coincide con el cuerpo." });
        }

        try
        {
            var process = await _sender.Send(command);
            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Update(Guid companyId, Guid id, [FromBody] UpdatePurchaseProcessCommand command)
    {
        if (companyId != command.CompanyId || id != command.Id)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var process = await _sender.Send(command);
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/publish")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Publish(Guid companyId, Guid id)
    {
        try
        {
            var process = await _sender.Send(new PublishPurchaseProcessCommand(companyId, id));
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/close")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Close(Guid companyId, Guid id)
    {
        try
        {
            var process = await _sender.Send(new ClosePurchaseProcessCommand(companyId, id));
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/invitations")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<List<InvitationDto>>> GetInvitations(Guid companyId, Guid id)
    {
        try
        {
            var invitations = await _sender.Send(new GetInvitationsByProcessQuery(companyId, id));
            return Ok(invitations);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/invitations")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<InvitationDto>> InviteSupplier(Guid companyId, Guid id, [FromBody] InviteSupplierCommand command)
    {
        if (companyId != command.CompanyId || id != command.PurchaseProcessId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var invitation = await _sender.Send(command);
            return Ok(invitation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PurchaseProcessDto>> Approve(Guid companyId, Guid id, [FromBody] ApproveRequest request)
    {
        try
        {
            var process = await _sender.Send(new ApprovePurchaseProcessCommand(companyId, id, request.ApproverId));
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PurchaseProcessDto>> Reject(Guid companyId, Guid id, [FromBody] RejectRequest request)
    {
        try
        {
            var process = await _sender.Send(new RejectPurchaseProcessCommand(companyId, id, request.ApproverId, request.Motivo));
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<PurchaseProcessDto>> Evaluate(Guid companyId, Guid id, [FromBody] EvaluateRequest request)
    {
        try
        {
            var process = await _sender.Send(new RegisterEvaluationCommand(
                companyId,
                id,
                request.EvaluadorId,
                request.RecomendadoProveedor,
                request.Observaciones
            ));

            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/adjudicate")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PurchaseProcessDto>> Adjudicate(Guid companyId, Guid id, [FromBody] AdjudicateRequest request)
    {
        try
        {
            var process = await _sender.Send(new AdjudicateProcessCommand(companyId, id, request.AprobadorId, request.Awards));
            if (process == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(process);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/award/pdf")]
    [Authorize]
    public async Task<IActionResult> GetAwardPdf(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        if (process == null || process.Award == null)
        {
            return NotFound(new { message = "El acta de adjudicación no está disponible para este proceso." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "awards", $"{process.Award.Id}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo físico del acta no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Acta-Adjudicacion-{process.Code}.pdf");
    }

    [HttpGet("{id:guid}/awards/{awardId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetAwardPdf(Guid companyId, Guid id, Guid awardId)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        var award = process?.Awards.FirstOrDefault(a => a.Id == awardId);
        if (process == null || award == null)
        {
            return NotFound(new { message = "El acta de adjudicacion no esta disponible para este proveedor." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "awards", $"{awardId}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico del acta no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Acta-Adjudicacion-{process.Code}-{award.Proveedor}.pdf");
    }

    [HttpPost("{id:guid}/contract")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractDto>> CreateContract(Guid companyId, Guid id, [FromBody] CreateContractCommand command)
    {
        if (companyId != command.CompanyId || id != command.PurchaseProcessId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var contract = await _sender.Send(command);
            if (contract == null)
            {
                return NotFound(new { message = "Proceso de compra no encontrado." });
            }

            return Ok(contract);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("~/api/companies/{companyId:guid}/contracts/{contractId:guid}/purchase-order")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseOrderDto>> IssuePurchaseOrder(Guid companyId, Guid contractId, [FromBody] IssuePurchaseOrderCommand command)
    {
        if (companyId != command.CompanyId || contractId != command.ContractId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var order = await _sender.Send(command);
            if (order == null)
            {
                return NotFound(new { message = "Contrato no encontrado." });
            }

            return Ok(order);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("~/api/companies/{companyId:guid}/purchase-orders/{purchaseOrderId:guid}/receptions")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ReceptionConfirmationDto>> ConfirmReception(Guid companyId, Guid purchaseOrderId, [FromBody] ConfirmReceptionCommand command)
    {
        if (companyId != command.CompanyId || purchaseOrderId != command.PurchaseOrderId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        try
        {
            var reception = await _sender.Send(command);
            if (reception == null)
            {
                return NotFound(new { message = "Orden de compra no encontrada." });
            }

            return Ok(reception);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("~/api/companies/{companyId:guid}/contracts/{contractId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetContractPdf(Guid companyId, Guid contractId)
    {
        var process = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var contract = process.Items.Select(p => p.Contract).FirstOrDefault(c => c?.Id == contractId);
        if (contract == null)
        {
            return NotFound(new { message = "Contrato no encontrado." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "contracts", $"{contractId}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico del contrato no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Contrato-{contract.Number}.pdf");
    }

    [HttpGet("~/api/companies/{companyId:guid}/purchase-orders/{purchaseOrderId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetPurchaseOrderPdf(Guid companyId, Guid purchaseOrderId)
    {
        var process = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var order = process.Items.Select(p => p.PurchaseOrder).FirstOrDefault(o => o?.Id == purchaseOrderId);
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

    [HttpGet("~/api/companies/{companyId:guid}/receptions/{receptionId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetReceptionPdf(Guid companyId, Guid receptionId)
    {
        var process = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var reception = process.Items
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

public record ApproveRequest(Guid ApproverId);
public record RejectRequest(Guid ApproverId, string Motivo);
public record EvaluateRequest(Guid EvaluadorId, string RecomendadoProveedor, string Observaciones);
public record AdjudicateRequest(Guid AprobadorId, List<AwardSelectionInputDto>? Awards = null);
