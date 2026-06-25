using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Security;
using SICST.Application.Users.Commands;
using SICST.Application.Users.Queries;

namespace SICST.Api.Controllers;

[ApiController]
[Route("api/companies/{companyId}/users")]
[Authorize(Policy = PermissionCodes.UsersManage)]
public class UsersController : ControllerBase
{
    private readonly ISender _sender;

    public UsersController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet]
    public async Task<ActionResult> GetUsers(
        Guid companyId, 
        [FromQuery] string? search, 
        [FromQuery] string? role, 
        [FromQuery] bool? activeOnly,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = new GetUsersQuery
        {
            CompanyId = companyId,
            Search = search,
            Role = role,
            ActiveOnly = activeOnly,
            PageNumber = pageNumber,
            PageSize = pageSize,
        };
        var users = await _sender.Send(query);
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetUser(Guid companyId, Guid id)
    {
        var query = new GetUserQuery { CompanyId = companyId, Id = id };
        var user = await _sender.Send(query);
        return Ok(user);
    }

    [HttpPost]
    public async Task<ActionResult> CreateUser(Guid companyId, [FromBody] CreateUserCommand command)
    {
        var user = await _sender.Send(command with { CompanyId = companyId });
        return CreatedAtAction(nameof(GetUser), new { companyId, id = user.Id }, user);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateUser(Guid companyId, Guid id, [FromBody] UpdateUserCommand command)
    {
        var user = await _sender.Send(command with { CompanyId = companyId, Id = id });
        return Ok(user);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult> ToggleUserStatus(Guid companyId, Guid id, [FromBody] ToggleUserStatusCommand command)
    {
        await _sender.Send(command with { CompanyId = companyId, Id = id });
        return Ok(new { message = "Estado actualizado." });
    }
}
