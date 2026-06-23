using MediatR;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Auth.Commands;
using SICST.Application.Auth.DTOs;

namespace SICST.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISender _sender;

    public AuthController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPost("register")]
    public async Task<ActionResult<Guid>> Register([FromBody] RegisterUserCommand command)
    {
        var userId = await _sender.Send(command);
        return Ok(userId);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginCommand command)
    {
        var response = await _sender.Send(command);
        return Ok(response);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenCommand command)
    {
        var response = await _sender.Send(command);
        return Ok(response);
    }
}
