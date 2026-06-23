using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Configuration.Commands;
using SICST.Application.Configuration.DTOs;
using SICST.Application.Configuration.Queries;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/companies/{companyId:guid}/configuration")]
public class ConfigurationController : ControllerBase
{
    private readonly ISender _sender;

    public ConfigurationController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.ConfigurationRead)]
    public async Task<ActionResult<CompanyConfigurationDto>> GetCompanyConfiguration(Guid companyId)
    {
        var configuration = await _sender.Send(new GetCompanyConfigurationQuery(companyId));
        if (configuration == null)
        {
            return NotFound(new { message = "Empresa no encontrada." });
        }

        return Ok(configuration);
    }

    [HttpPut]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<CompanyConfigurationDto>> UpsertCompanyConfiguration(
        Guid companyId,
        [FromBody] UpsertCompanyConfigurationCommand command)
    {
        if (companyId != command.CompanyId)
        {
            return BadRequest(new { message = "El ID de empresa de la URL no coincide con el cuerpo." });
        }

        try
        {
            var configuration = await _sender.Send(command);
            return Ok(configuration);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("contracting-modes")]
    [Authorize(Policy = PermissionCodes.ConfigurationRead)]
    public async Task<ActionResult<List<ContractingModeDto>>> GetContractingModes(Guid companyId)
    {
        var modes = await _sender.Send(new GetContractingModesQuery(companyId));
        return Ok(modes);
    }

    [HttpPost("contracting-modes")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<ContractingModeDto>> CreateContractingMode(
        Guid companyId,
        [FromBody] CreateContractingModeCommand command)
    {
        if (companyId != command.CompanyId)
        {
            return BadRequest(new { message = "El ID de empresa de la URL no coincide con el cuerpo." });
        }

        try
        {
            var mode = await _sender.Send(command);
            return Ok(mode);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("approval-workflows")]
    [Authorize(Policy = PermissionCodes.ConfigurationRead)]
    public async Task<ActionResult<List<ApprovalWorkflowDto>>> GetApprovalWorkflows(Guid companyId)
    {
        var workflows = await _sender.Send(new GetApprovalWorkflowsQuery(companyId));
        return Ok(workflows);
    }

    [HttpPost("approval-workflows")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<ApprovalWorkflowDto>> CreateApprovalWorkflow(
        Guid companyId,
        [FromBody] CreateApprovalWorkflowCommand command)
    {
        if (companyId != command.CompanyId)
        {
            return BadRequest(new { message = "El ID de empresa de la URL no coincide con el cuerpo." });
        }

        try
        {
            var workflow = await _sender.Send(command);
            return Ok(workflow);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
