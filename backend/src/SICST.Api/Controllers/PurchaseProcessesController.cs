using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Purchases.Commands;
using SICST.Application.Purchases.DTOs;
using SICST.Application.Purchases.Queries;
using SICST.Domain.Entities;

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
    public async Task<ActionResult<List<PurchaseProcessDto>>> GetAll(
        Guid companyId,
        [FromQuery] string? search,
        [FromQuery] PurchaseProcessStatus? status)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, search, status));
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
}
