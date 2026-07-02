using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Identity.Users.Commands;

public record ToggleUserStatusCommand : IRequest<Unit>
{
    public Guid CompanyId { get; init; }
    public Guid Id { get; init; }
    public bool Active { get; init; }
}

public class ToggleUserStatusCommandHandler : IRequestHandler<ToggleUserStatusCommand, Unit>
{
    private readonly IApplicationDbContext _context;

    public ToggleUserStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Unit> Handle(ToggleUserStatusCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id && u.CompanyId == request.CompanyId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        user.Active = request.Active;

        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
