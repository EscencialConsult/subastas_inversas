using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Auth.Commands;

public record VerifyMfaCommand : IRequest<AuthResponseDto>
{
    public string MfaToken { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
}

public class VerifyMfaCommandHandler : IRequestHandler<VerifyMfaCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtProvider _jwtProvider;
    private readonly IMfaProvider _mfaProvider;

    public VerifyMfaCommandHandler(IApplicationDbContext context, IJwtProvider jwtProvider, IMfaProvider mfaProvider)
    {
        _context = context;
        _jwtProvider = jwtProvider;
        _mfaProvider = mfaProvider;
    }

    public async Task<AuthResponseDto> Handle(VerifyMfaCommand request, CancellationToken cancellationToken)
    {
        if (!_jwtProvider.TryGetMfaUserId(request.MfaToken, out var userId))
        {
            throw new UnauthorizedAccessException("MFA token is invalid or expired.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null || !user.Active || !user.MfaEnabled || string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            throw new UnauthorizedAccessException("MFA challenge is invalid.");
        }

        if (!_mfaProvider.VerifyCode(user.MfaSecret, request.Code))
        {
            throw new UnauthorizedAccessException("MFA code is invalid.");
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

        var accessToken = _jwtProvider.Generate(user);
        var refreshToken = RefreshTokenHelper.Generate();
        user.RefreshTokenHash = RefreshTokenHelper.Hash(refreshToken);
        user.RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(30);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Token = accessToken,
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
            MfaEnabled = true
        };
    }
}
