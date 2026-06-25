using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auth.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Auth.Commands;

public record SetupMfaCommand(Guid UserId) : IRequest<MfaSetupDto>;

public class SetupMfaCommandHandler : IRequestHandler<SetupMfaCommand, MfaSetupDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IMfaProvider _mfaProvider;

    public SetupMfaCommandHandler(IApplicationDbContext context, IMfaProvider mfaProvider)
    {
        _context = context;
        _mfaProvider = mfaProvider;
    }

    public async Task<MfaSetupDto> Handle(SetupMfaCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user == null || !user.Active)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        if (user.MfaEnabled)
        {
            throw new InvalidOperationException("MFA ya esta activo.");
        }

        user.MfaSecret = _mfaProvider.GenerateSecret();
        await _context.SaveChangesAsync(cancellationToken);

        return new MfaSetupDto
        {
            Secret = user.MfaSecret,
            OtpAuthUri = _mfaProvider.GetTotpUri("SICST", user.Email, user.MfaSecret)
        };
    }
}
