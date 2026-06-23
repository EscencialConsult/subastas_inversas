using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Companies.DTOs;

namespace SICST.Application.Companies.Queries;

public record GetCompaniesQuery(int PageNumber = 1, int PageSize = 10) : IRequest<PagedResult<CompanyDto>>;

public class GetCompaniesQueryHandler : IRequestHandler<GetCompaniesQuery, PagedResult<CompanyDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCompaniesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<CompanyDto>> Handle(GetCompaniesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Companies.AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(c => c.Name)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
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

        return new PagedResult<CompanyDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
