using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Configuration.Commands;
using SICST.Application.Modules.Configuration.DTOs;
using SICST.Application.Modules.Configuration.Queries;
using SICST.Domain.Entities;

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

    [HttpGet("contracting-modes/suggest")]
    [Authorize(Policy = PermissionCodes.ConfigurationRead)]
    public async Task<ActionResult<ContractingModeDto?>> SuggestContractingMode(Guid companyId, [FromQuery] decimal amount)
    {
        try
        {
            var mode = await _sender.Send(new SuggestContractingModeQuery(companyId, amount));
            return Ok(mode);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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

    [HttpPut("contracting-modes/{id:guid}")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<ContractingModeDto>> UpdateContractingMode(
        Guid companyId,
        Guid id,
        [FromBody] UpdateContractingModeCommand command)
    {
        if (companyId != command.CompanyId || id != command.Id)
        {
            return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
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

    [HttpDelete("contracting-modes/{id:guid}")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<IActionResult> DeleteContractingMode(Guid companyId, Guid id)
    {
        try
        {
            await _sender.Send(new DeleteContractingModeCommand(companyId, id));
            return NoContent();
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

    [HttpPut("approval-workflows/{id:guid}")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<ApprovalWorkflowDto>> UpdateApprovalWorkflow(
        Guid companyId,
        Guid id,
        [FromBody] UpdateApprovalWorkflowCommand command)
    {
        if (companyId != command.CompanyId || id != command.Id)
        {
            return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
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

    [HttpDelete("approval-workflows/{id:guid}")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<IActionResult> DeleteApprovalWorkflow(Guid companyId, Guid id)
    {
        try
        {
            await _sender.Send(new DeleteApprovalWorkflowCommand(companyId, id));
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("document-templates")]
    [Authorize(Policy = PermissionCodes.ConfigurationRead)]
    public async Task<ActionResult<List<DocumentTemplateDto>>> GetDocumentTemplates(
        Guid companyId,
        [FromQuery] DocumentTemplateType? type)
    {
        var templates = await _sender.Send(new GetDocumentTemplatesQuery(companyId, type));
        return Ok(templates);
    }

    [HttpPost("document-templates")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<DocumentTemplateDto>> CreateDocumentTemplateVersion(
        Guid companyId,
        [FromBody] CreateDocumentTemplateVersionCommand command)
    {
        if (companyId != command.CompanyId)
        {
            return BadRequest(new { message = "El ID de empresa de la URL no coincide con el cuerpo." });
        }

        try
        {
            var template = await _sender.Send(command);
            return Ok(template);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("document-templates/{id:guid}/activate")]
    [Authorize(Policy = PermissionCodes.ConfigurationManage)]
    public async Task<ActionResult<DocumentTemplateDto>> ActivateDocumentTemplate(Guid companyId, Guid id)
    {
        try
        {
            var template = await _sender.Send(new ActivateDocumentTemplateCommand(companyId, id));
            return Ok(template);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
