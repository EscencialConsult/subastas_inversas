using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Auth.Commands;

public record RegisterUserCommand : IRequest<Guid>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public UserRole Role { get; init; }
    public Guid? CompanyId { get; init; }
}

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterUserCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        // Check if email already exists
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower(), cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Email is already in use.");
        }

        // Validate Company exists if CompanyId is provided
        if (request.CompanyId.HasValue)
        {
            var companyExists = await _context.Companies
                .AnyAsync(c => c.Id == request.CompanyId.Value, cancellationToken);
            
            if (!companyExists)
            {
                throw new InvalidOperationException("Associated company not found.");
            }
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLower(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            Active = true,
            CompanyId = request.CompanyId
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return user.Id;
    }
}
