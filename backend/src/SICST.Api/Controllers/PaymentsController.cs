using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Purchases.Commands;
using SICST.Application.Modules.Purchases.DTOs;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
public class PaymentsController : ControllerBase
{
    private readonly ISender _sender;

    public PaymentsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("api/v1/companies/{companyId:guid}/contracts/{contractId:guid}/payments")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractPaymentDto>> RegisterContractPayment(Guid companyId, Guid contractId, [FromBody] RegisterContractPaymentCommand command)
    {
        if (companyId != command.CompanyId || contractId != command.ContractId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var payment = await _sender.Send(command);
        return payment == null ? NotFound(new { message = "Contrato no encontrado." }) : Ok(payment);
    }
}
