using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Purchases.Commands;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Application.Modules.Purchases.Queries;
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

    [HttpGet("approvals")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PagedResult<PurchaseProcessDto>>> GetPendingApprovals(
        Guid companyId,
        [FromQuery] string? search,
        [FromQuery] PurchaseProcessStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, search, status, pageNumber, pageSize));
        return Ok(processes);
    }

    [HttpGet("{id:guid}/approval")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PurchaseProcessDto>> GetApprovalById(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        if (process == null)
        {
            return NotFound(new { message = "Proceso de compra no encontrado." });
        }

        return Ok(process);
    }

    [HttpGet("audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<PagedResult<PurchaseProcessDto>>> GetForAudit(
        Guid companyId,
        [FromQuery] string? search,
        [FromQuery] PurchaseProcessStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, search, status, pageNumber, pageSize));
        return Ok(processes);
    }

    [HttpGet("{id:guid}/audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<PurchaseProcessDto>> GetAuditById(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        if (process == null)
        {
            return NotFound(new { message = "Proceso de compra no encontrado." });
        }

        return Ok(process);
    }

    [HttpGet("qualification")]
    [Authorize(Policy = PermissionCodes.PurchasesManageOrEvaluate)]
    public async Task<ActionResult<List<PurchaseProcessDto>>> GetForQualification(
        Guid companyId,
        [FromQuery] string? search)
    {
        var processes = await _sender.Send(new GetProcessesForQualificationQuery(companyId, search));
        return Ok(processes);
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

    [HttpPost("{id:guid}/desert")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> DeclareDeserted(Guid companyId, Guid id, [FromBody] ExceptionDecisionRequest request)
    {
        try
        {
            var process = await _sender.Send(new DeclarePurchaseProcessDesertedCommand(companyId, id, request.OperatorId, request.Fundamento));
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

    [HttpPost("{id:guid}/challenge/suspend")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> SuspendByChallenge(Guid companyId, Guid id, [FromBody] ExceptionDecisionRequest request)
    {
        try
        {
            var process = await _sender.Send(new SuspendPurchaseProcessByChallengeCommand(companyId, id, request.OperatorId, request.Fundamento));
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

    [HttpGet("{id:guid}/invitations/audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<List<InvitationDto>>> GetInvitationsAudit(Guid companyId, Guid id)
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

    [HttpPost("{id:guid}/return")]
    [Authorize(Policy = PermissionCodes.PurchasesApprove)]
    public async Task<ActionResult<PurchaseProcessDto>> Return(Guid companyId, Guid id, [FromBody] ReturnRequest request)
    {
        try
        {
            var process = await _sender.Send(new ReturnPurchaseProcessCommand(companyId, id, request.ApproverId, request.Motivo));
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
}
