using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Identity.Auth.Commands;

public record EnableMfaCommand(Guid UserId, string Code) : IRequest<Unit>;

public class EnableMfaCommandHandler : IRequestHandler<EnableMfaCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly IMfaProvider _mfaProvider;

    public EnableMfaCommandHandler(IApplicationDbContext context, IMfaProvider mfaProvider)
    {
        _context = context;
        _mfaProvider = mfaProvider;
    }

    public async Task<Unit> Handle(EnableMfaCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user == null || string.IsNullOrWhiteSpace(user.MfaSecret))
        {
            throw new InvalidOperationException("Primero genera la configuracion MFA.");
        }

        if (!_mfaProvider.VerifyCode(user.MfaSecret, request.Code))
        {
            throw new UnauthorizedAccessException("MFA code is invalid.");
        }

        user.MfaEnabled = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
