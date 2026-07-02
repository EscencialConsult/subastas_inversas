using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Identity.Users.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Identity.Users.Commands;

public record CreateUserCommand : IRequest<UserDto>
{
    public Guid CompanyId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, UserDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public CreateUserCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<UserDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        var companyExists = await _context.Companies
            .AnyAsync(c => c.Id == request.CompanyId, cancellationToken);

        if (!companyExists)
        {
            throw new InvalidOperationException("La empresa no existe.");
        }

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.Trim().ToLower(), cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Ya existe un usuario con ese email.");
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
        {
            throw new InvalidOperationException("El rol especificado no es válido.");
        }

        var tempPassword = Guid.NewGuid().ToString("N")[..12] + "Aa1!";

        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.Trim().ToLower(),
            Role = role,
            Active = true,
            CompanyId = request.CompanyId,
            PasswordHash = _passwordHasher.Hash(tempPassword),
        };

        _context.Users.Add(user);
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
            TemporaryPassword = tempPassword,
        };
    }
}
