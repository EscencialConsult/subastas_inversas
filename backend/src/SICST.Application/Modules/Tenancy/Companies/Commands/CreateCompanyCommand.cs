using MediatR;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Tenancy.Companies.Commands;

public record CreateCompanyCommand : IRequest<Guid>
{
    public string Name { get; init; } = string.Empty;
    public string Domain { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public string? PrimaryColor { get; init; }
    public bool IsPublicEntity { get; init; }
}

public class CreateCompanyCommandHandler : IRequestHandler<CreateCompanyCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateCompanyCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateCompanyCommand request, CancellationToken cancellationToken)
    {
        var entity = new Company
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Domain = request.Domain.ToLower(),
            Logo = request.Logo,
            PrimaryColor = request.PrimaryColor,
            IsPublicEntity = request.IsPublicEntity
        };

        _context.Companies.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
