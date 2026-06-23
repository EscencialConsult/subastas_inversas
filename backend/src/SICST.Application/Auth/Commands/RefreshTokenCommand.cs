using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Auth.Commands;

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

        if (user == null || !user.Active || !_jwtProvider.IsValidForUser(request.RefreshToken, request.Email))
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        var token = _jwtProvider.Generate(user);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = token,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            CompanyId = user.CompanyId
        };
    }
}
