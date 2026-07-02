using SICST.Domain.Entities;

namespace SICST.Application.Modules.Identity.Auth.DTOs;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public Guid? CompanyId { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyLogo { get; set; }
    public string? CompanyPrimaryColor { get; set; }
    public string RefreshToken { get; set; } = string.Empty;
    public bool RequiresMfa { get; set; }
    public bool MfaEnabled { get; set; }
    public string? MfaToken { get; set; }
}
