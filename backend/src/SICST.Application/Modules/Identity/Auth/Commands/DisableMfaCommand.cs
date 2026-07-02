using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Identity.Auth.Commands;

public record DisableMfaCommand(Guid UserId, string Code) : IRequest<Unit>;

public class DisableMfaCommandHandler : IRequestHandler<DisableMfaCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IMfaProvider _mfaProvider;

    public DisableMfaCommandHandler(IApplicationDbContext context, IMfaProvider mfaProvider)
    {
        _context = context;
        _mfaProvider = mfaProvider;
    }

    public async Task<Unit> Handle(DisableMfaCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user == null || !user.MfaEnabled || string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            throw new InvalidOperationException("MFA no esta activo.");
        }

        if (!_mfaProvider.VerifyCode(user.MfaSecret, request.Code))
        {
            throw new UnauthorizedAccessException("MFA code is invalid.");
        }

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
