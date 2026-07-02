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
public class ContractsController : ControllerBase
{
    private readonly ISender _sender;

    public ContractsController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("api/v1/companies/{companyId:guid}/purchase-processes/{id:guid}/contract")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractDto>> CreateContract(Guid companyId, Guid id, [FromBody] CreateContractCommand command)
    {
        if (companyId != command.CompanyId || id != command.PurchaseProcessId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var contract = await _sender.Send(command);
        return contract == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(contract);
    }

    [HttpGet("api/v1/companies/{companyId:guid}/purchase-processes/{id:guid}/contracts/{contractId:guid}")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractDto>> GetContract(Guid companyId, Guid id, Guid contractId)
    {
        var contract = await _sender.Send(new GetContractQuery { CompanyId = companyId, ContractId = contractId });
        return contract == null || contract.PurchaseProcessId != id
            ? NotFound(new { message = "Contrato no encontrado en este proceso." })
            : Ok(contract);
    }

    [HttpPut("api/v1/companies/{companyId:guid}/purchase-processes/{id:guid}/contracts/{contractId:guid}/terms")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractDto>> UpdateContractTerms(Guid companyId, Guid id, Guid contractId, [FromBody] UpdateContractTermsCommand command)
    {
        if (companyId != command.CompanyId || id != command.PurchaseProcessId || contractId != command.ContractId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var contract = await _sender.Send(command);
        return contract == null ? NotFound(new { message = "Contrato no encontrado." }) : Ok(contract);
    }

    [HttpPost("api/v1/companies/{companyId:guid}/purchase-processes/{id:guid}/contracts/{contractId:guid}/sign")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<ContractDto>> SignContract(Guid companyId, Guid id, Guid contractId, [FromBody] SignContractCommand command)
    {
        if (companyId != command.CompanyId || id != command.PurchaseProcessId || contractId != command.ContractId)
        {
            return BadRequest(new { message = "Los IDs de la URL no coinciden con el cuerpo." });
        }

        var contract = await _sender.Send(command);
        return contract == null ? NotFound(new { message = "Contrato no encontrado." }) : Ok(contract);
    }

    [HttpGet("api/v1/companies/{companyId:guid}/contracts/{contractId:guid}/pdf")]
    [Authorize]
    public async Task<IActionResult> GetContractPdf(Guid companyId, Guid contractId)
    {
        var processes = await _sender.Send(new GetPurchaseProcessesQuery(companyId, PageSize: 999999));
        var contract = processes.Items.Select(p => p.Contract).FirstOrDefault(c => c?.Id == contractId);
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
}
