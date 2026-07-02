using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Identity.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Identity.Auth.Commands;

public record RefreshTokenCommand : IRequest<AuthResponseDto>
{
    public string Email { get; init; } = string.Empty;
    public string RefreshToken { get; init; } = string.Empty;
}

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtProvider _jwtProvider;

    public RefreshTokenCommandHandler(IApplicationDbContext context, IJwtProvider jwtProvider)
    {
        _context = context;
        _jwtProvider = jwtProvider;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), cancellationToken);

        var tokenHash = RefreshTokenHelper.Hash(request.RefreshToken);
        if (user != null &&
            user.Active &&
            user.RefreshTokenHash != null &&
            user.RefreshTokenHash != tokenHash)
        {
            user.RefreshTokenHash = null;
            user.RefreshTokenExpiresAtUtc = null;
            user.RefreshTokenRevokedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        if (user == null ||
            !user.Active ||
            user.RefreshTokenRevokedAtUtc != null ||
            user.RefreshTokenHash != tokenHash ||
            user.RefreshTokenExpiresAtUtc == null ||
            user.RefreshTokenExpiresAtUtc <= DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        string? companyName = null;
        string? companyLogo = null;
        string? companyPrimaryColor = null;
        if (user.CompanyId.HasValue)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == user.CompanyId.Value, cancellationToken);
            companyName = company?.Name;
            companyLogo = company?.Logo;
            companyPrimaryColor = company?.PrimaryColor;
        }

        var token = _jwtProvider.Generate(user);
        var refreshToken = RefreshTokenHelper.Generate();
        user.RefreshTokenHash = RefreshTokenHelper.Hash(refreshToken);
        user.RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(30);
        user.RefreshTokenRevokedAtUtc = null;
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            CompanyId = user.CompanyId,
            CompanyName = companyName,
            CompanyLogo = companyLogo,
            CompanyPrimaryColor = companyPrimaryColor,
            MfaEnabled = user.MfaEnabled
        };
    }
}
