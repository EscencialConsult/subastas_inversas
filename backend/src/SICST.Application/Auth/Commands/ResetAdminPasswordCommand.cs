using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Auth.Commands;

public record ResetAdminPasswordCommand : IRequest<ResetAdminPasswordDto>
{
    public Guid UserId { get; init; }
    public string NewPassword { get; init; } = string.Empty;
}

public class ResetAdminPasswordCommandHandler : IRequestHandler<ResetAdminPasswordCommand, ResetAdminPasswordDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public ResetAdminPasswordCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<ResetAdminPasswordDto> Handle(ResetAdminPasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);

        await _context.SaveChangesAsync(cancellationToken);

        return new ResetAdminPasswordDto
        {
            NewPassword = request.NewPassword
        };
    }
}
