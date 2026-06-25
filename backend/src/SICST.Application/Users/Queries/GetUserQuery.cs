using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Users.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Users.Queries;

public record GetUserQuery : IRequest<UserDto>
{
    public Guid CompanyId { get; init; }
    public Guid Id { get; init; }
}

public class GetUserQueryHandler : IRequestHandler<GetUserQuery, UserDto>
{
    private readonly IApplicationDbContext _context;

    public GetUserQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto> Handle(GetUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id && u.CompanyId == request.CompanyId, cancellationToken);

        if (user == null)
        {
            throw new InvalidOperationException("Usuario no encontrado.");
        }

        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role.ToString(),
            Active = user.Active,
            MfaEnabled = user.MfaEnabled,
            CompanyId = user.CompanyId,
        };
    }
}
