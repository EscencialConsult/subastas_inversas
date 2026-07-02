using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Tenancy.Companies.DTOs;

namespace SICST.Application.Modules.Tenancy.Companies.Queries;

public record GetCompanyByIdQuery(Guid Id) : IRequest<CompanyDto?>;

public class GetCompanyByIdQueryHandler : IRequestHandler<GetCompanyByIdQuery, CompanyDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCompanyByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CompanyDto?> Handle(GetCompanyByIdQuery request, CancellationToken cancellationToken)
    {
        var entity = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            return null;
        }

        return new CompanyDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Domain = entity.Domain,
            Logo = entity.Logo,
            PrimaryColor = entity.PrimaryColor,
            IsPublicEntity = entity.IsPublicEntity
        };
    }
}
