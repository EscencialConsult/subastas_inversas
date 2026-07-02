using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using SICST.Application.Modules.Identity.Auth.Commands;
using SICST.Application.Modules.Identity.Auth.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Security;
using SICST.Domain.Entities;

namespace SICST.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISender _sender;
    private readonly IApplicationDbContext _context;

    public AuthController(ISender sender, IApplicationDbContext context)
    {
        _sender = sender;
        _context = context;
    }

    [HttpPost("register")]
    [Authorize(Policy = PermissionCodes.UsersManage)]
    public async Task<ActionResult<Guid>> Register([FromBody] RegisterUserCommand command)
    {
        var userId = await _sender.Send(command);
        return Ok(userId);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginCommand command)
    {
        try
        {
            var response = await _sender.Send(command);
            await LogAccessAsync(
                response.RequiresMfa ? AccessLogEventType.MfaRequired : AccessLogEventType.LoginSucceeded,
                response.Email,
                response.UserId,
                response.CompanyId,
                true,
                null);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            await LogAccessAsync(AccessLogEventType.LoginFailed, command.Email, null, null, false, ex.Message);
            throw;
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenCommand command)
    {
        try
        {
            var response = await _sender.Send(command);
            await LogAccessAsync(AccessLogEventType.RefreshSucceeded, response.Email, response.UserId, response.CompanyId, true, null);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            await LogAccessAsync(AccessLogEventType.RefreshFailed, command.Email, null, null, false, ex.Message);
            throw;
        }
    }

    [HttpPost("mfa/verify")]
    public async Task<ActionResult<AuthResponseDto>> VerifyMfa([FromBody] VerifyMfaCommand command)
    {
        try
        {
            var response = await _sender.Send(command);
            await LogAccessAsync(AccessLogEventType.MfaSucceeded, response.Email, response.UserId, response.CompanyId, true, null);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            await LogAccessAsync(AccessLogEventType.MfaFailed, string.Empty, null, null, false, ex.Message);
            throw;
        }
    }

    [Authorize]
    [HttpPost("mfa/setup")]
    public async Task<ActionResult<MfaSetupDto>> SetupMfa()
    {
        var userId = GetCurrentUserId();
        var setup = await _sender.Send(new SetupMfaCommand(userId));
        return Ok(setup);
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    public async Task<ActionResult> EnableMfa([FromBody] MfaCodeRequest request)
    {
        await _sender.Send(new EnableMfaCommand(GetCurrentUserId(), request.Code));
        return Ok(new { message = "MFA activado." });
    }

    [Authorize]
    [HttpPost("mfa/disable")]
    public async Task<ActionResult> DisableMfa([FromBody] MfaCodeRequest request)
    {
        await _sender.Send(new DisableMfaCommand(GetCurrentUserId(), request.Code));
        return Ok(new { message = "MFA desactivado." });
    }

    [HttpPost("reset-password")]
    [Authorize(Policy = PermissionCodes.UsersManage)]
    public async Task<ActionResult<ResetAdminPasswordDto>> ResetAdminPassword([FromBody] ResetAdminPasswordCommand command)
    {
        var result = await _sender.Send(command);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<ActionResult> Logout()
    {
        var userId = GetCurrentUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshTokenHash = null;
            user.RefreshTokenExpiresAtUtc = null;
            await LogAccessAsync(AccessLogEventType.Logout, user.Email, user.Id, user.CompanyId, true, null, saveImmediately: false);
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
        }

        return Ok(new { message = "Sesion cerrada." });
    }

    private Guid GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException("Usuario no autenticado.");
        }

        return userId;
    }

    private async Task LogAccessAsync(
        AccessLogEventType eventType,
        string email,
        Guid? userId,
        Guid? companyId,
        bool success,
        string? failureReason,
        bool saveImmediately = true)
    {
        _context.AccessLogs.Add(new AccessLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CompanyId = companyId,
            Email = email.Trim().ToLowerInvariant(),
            EventType = eventType,
            Success = success,
            FailureReason = failureReason,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            OccurredAtUtc = DateTime.UtcNow
        });

        if (saveImmediately)
        {
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
        }
    }
}

public record MfaCodeRequest(string Code);
