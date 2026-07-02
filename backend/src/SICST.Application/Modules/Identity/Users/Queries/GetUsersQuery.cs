using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Application.Modules.Identity.Users.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Identity.Users.Queries;

public record GetUsersQuery : IRequest<PagedResult<UserDto>>
{
    public Guid CompanyId { get; init; }
    public string? Search { get; init; }
    public string? Role { get; init; }
    public bool? ActiveOnly { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, PagedResult<UserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUsersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users
            .Where(u => u.CompanyId == request.CompanyId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(search) ||
                u.LastName.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            if (Enum.TryParse<UserRole>(request.Role, true, out var role))
            {
                query = query.Where(u => u.Role == role);
            }
        }

        if (request.ActiveOnly == true)
        {
            query = query.Where(u => u.Active);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Role = u.Role.ToString(),
                Active = u.Active,
                MfaEnabled = u.MfaEnabled,
                CompanyId = u.CompanyId,
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<UserDto>(items, totalCount, request.PageNumber, request.PageSize);
    }
}
