namespace SICST.Domain.Entities;

public enum UserRole
{
    SuperAdmin,
    Admin,
    Comprador,
    Proveedor,
    Evaluador,
    Auditor,
    Autoridad
}

public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public bool Active { get; set; } = true;

    public bool MfaEnabled { get; set; }

    public string? MfaSecret { get; set; }

    public string? RefreshTokenHash { get; set; }

    public DateTime? RefreshTokenExpiresAtUtc { get; set; }

    public DateTime? RefreshTokenRevokedAtUtc { get; set; }

    // Navigation and Foreign Key to Company
    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }
}
