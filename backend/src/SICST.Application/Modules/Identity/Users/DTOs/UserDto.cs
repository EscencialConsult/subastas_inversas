namespace SICST.Application.Modules.Identity.Users.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool Active { get; set; }
    public bool MfaEnabled { get; set; }
    public Guid? CompanyId { get; set; }
    public string? TemporaryPassword { get; set; }
}
