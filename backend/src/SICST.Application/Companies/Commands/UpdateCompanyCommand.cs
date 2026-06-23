using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Companies.Commands;

public record UpdateCompanyCommand : IRequest<bool>
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Domain { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public string? PrimaryColor { get; init; }
    public bool IsPublicEntity { get; init; }
}

public class UpdateCompanyCommandHandler : IRequestHandler<UpdateCompanyCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateCompanyCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateCompanyCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            return false;
        }

        entity.Name = request.Name;
        entity.Domain = request.Domain.ToLower();
        entity.Logo = request.Logo;
        entity.PrimaryColor = request.PrimaryColor;
        entity.IsPublicEntity = request.IsPublicEntity;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
