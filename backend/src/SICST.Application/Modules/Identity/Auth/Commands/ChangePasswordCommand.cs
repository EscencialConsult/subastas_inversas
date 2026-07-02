using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Identity.Auth.Commands;

public record ChangePasswordCommand : IRequest<Unit>
{
    public Guid UserId { get; init; }
    public string CurrentPassword { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}

public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public ChangePasswordCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Unit> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        var isCurrentPasswordValid = _passwordHasher.Verify(request.CurrentPassword, user.PasswordHash);
        if (!isCurrentPasswordValid)
        {
            throw new UnauthorizedAccessException("La contraseña actual no es correcta.");
        }

        if (request.NewPassword.Length < 6)
        {
            throw new InvalidOperationException("La nueva contraseña debe tener al menos 6 caracteres.");
        }

        user.PasswordHash = _passwordHasher.Hash(request.NewPassword);

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
