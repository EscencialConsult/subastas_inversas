using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Tenancy.Companies.Commands;
using SICST.Application.Modules.Tenancy.Companies.DTOs;
using SICST.Application.Modules.Tenancy.Companies.Queries;
using SICST.Application.Common.Models;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly ISender _sender;

    public CompaniesController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost]
    [Authorize(Policy = PermissionCodes.CompaniesCreate)]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateCompanyCommand command)
    {
        var id = await _sender.Send(command);
        return CreatedAtAction(nameof(GetById), new { id }, id);
    }

    [HttpPost("with-admin")]
    [Authorize(Policy = PermissionCodes.CompaniesCreate)]
    public async Task<ActionResult<CompanyCreationResultDto>> CreateWithAdmin([FromBody] CreateCompanyWithAdminCommand command)
    {
        try
        {
            var result = await _sender.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result.CompanyId }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    [Authorize(Policy = PermissionCodes.CompaniesRead)]
    public async Task<ActionResult<PagedResult<CompanyDto>>> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var companies = await _sender.Send(new GetCompaniesQuery(pageNumber, pageSize));
        return Ok(companies);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = PermissionCodes.CompaniesRead)]
    public async Task<ActionResult<CompanyDto>> GetById(Guid id)
    {
        var company = await _sender.Send(new GetCompanyByIdQuery(id));
        if (company == null)
        {
            return NotFound();
        }
        return Ok(company);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = PermissionCodes.CompaniesUpdate)]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateCompanyCommand command)
    {
        if (id != command.Id)
        {
            return BadRequest("ID in URL does not match ID in body.");
        }

        var updated = await _sender.Send(command);
        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }
}
