using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Auth.Commands;

public record UpdateProfileCommand : IRequest<AuthResponseDto>
{
    public Guid UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
}

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateProfileCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AuthResponseDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Id != request.UserId, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Ya existe otro usuario con ese email.");
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = request.Email.Trim().ToLower();

        await _context.SaveChangesAsync(cancellationToken);

        string? companyName = null;
        if (user.CompanyId.HasValue)
        {
            var company = await _context.Companies
                .FirstOrDefaultAsync(c => c.Id == user.CompanyId.Value, cancellationToken);
            companyName = company?.Name;
        }

        return new AuthResponseDto
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role.ToString(),
            CompanyId = user.CompanyId,
            CompanyName = companyName,
            MfaEnabled = user.MfaEnabled,
        };
    }
}
