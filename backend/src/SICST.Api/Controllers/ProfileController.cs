using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Auth.Commands;
using SICST.Application.Auth.DTOs;

namespace SICST.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ISender _sender;

    public ProfileController(ISender sender)
    {
        _sender = sender;
    }

    [HttpPut("profile")]
    public async Task<ActionResult<AuthResponseDto>> UpdateProfile([FromBody] UpdateProfileCommand command)
    {
        try
        {
            var response = await _sender.Send(command);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordCommand command)
    {
        try
        {
            await _sender.Send(command);
            return Ok(new { message = "Contraseña actualizada." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }
}
