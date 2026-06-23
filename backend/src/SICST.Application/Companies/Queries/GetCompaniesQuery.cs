using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Companies.DTOs;

namespace SICST.Application.Companies.Queries;

public record GetCompaniesQuery : IRequest<List<CompanyDto>>;

public class GetCompaniesQueryHandler : IRequestHandler<GetCompaniesQuery, List<CompanyDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCompaniesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CompanyDto>> Handle(GetCompaniesQuery request, CancellationToken cancellationToken)
    {
        return await _context.Companies
            .Select(c => new CompanyDto
            {
                Id = c.Id,
                Name = c.Name,
                Domain = c.Domain,
                Logo = c.Logo,
                PrimaryColor = c.PrimaryColor,
                IsPublicEntity = c.IsPublicEntity
            })
            .ToListAsync(cancellationToken);
    }
}
