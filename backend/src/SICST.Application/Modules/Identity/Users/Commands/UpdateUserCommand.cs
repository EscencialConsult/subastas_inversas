using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Identity.Users.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Identity.Users.Commands;

public record UpdateUserCommand : IRequest<UserDto>
{
    public Guid CompanyId { get; init; }
    public Guid Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public bool Active { get; init; }
}

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, UserDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id && u.CompanyId == request.CompanyId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.Trim().ToLower() && u.Id != request.Id, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Ya existe otro usuario con ese email.");
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
        {
            throw new InvalidOperationException("El rol especificado no es válido.");
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Email = request.Email.Trim().ToLower();
        user.Role = role;
        user.Active = request.Active;

        await _context.SaveChangesAsync(cancellationToken);

        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role.ToString(),
            Active = user.Active,
            MfaEnabled = user.MfaEnabled,
            CompanyId = user.CompanyId,
        };
    }
}
