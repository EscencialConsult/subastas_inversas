using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Tenancy.Companies.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Tenancy.Companies.Commands;

public record CreateCompanyWithAdminCommand : IRequest<CompanyCreationResultDto>
{
    public string Name { get; init; } = string.Empty;
    public string Domain { get; init; } = string.Empty;
    public string? Logo { get; init; }
    public string? PrimaryColor { get; init; }
    public bool IsPublicEntity { get; init; }
    public string AdminFirstName { get; init; } = string.Empty;
    public string AdminLastName { get; init; } = string.Empty;
    public string AdminEmail { get; init; } = string.Empty;
}

public class CreateCompanyWithAdminCommandHandler : IRequestHandler<CreateCompanyWithAdminCommand, CompanyCreationResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public CreateCompanyWithAdminCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<CompanyCreationResultDto> Handle(CreateCompanyWithAdminCommand request, CancellationToken cancellationToken)
    {
        // 1. Verify company domain is unique
        var domainExists = await _context.Companies
            .AnyAsync(c => c.Domain.ToLower() == request.Domain.ToLower(), cancellationToken);

        if (domainExists)
        {
            throw new InvalidOperationException("Ya existe una organización con este subdominio.");
        }

        // 2. Verify admin email is unique
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.AdminEmail.ToLower(), cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Ya existe un usuario con el email especificado.");
        }

        // 3. Create the Company
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Domain = request.Domain.ToLower(),
            Logo = request.Logo,
            PrimaryColor = request.PrimaryColor,
            IsPublicEntity = request.IsPublicEntity
        };

        var tempPassword = Guid.NewGuid().ToString("N")[..12] + "Aa1!";

        // 4. Create the Admin User for this Company
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Email = request.AdminEmail.ToLower(),
            FirstName = request.AdminFirstName,
            LastName = request.AdminLastName,
            Role = UserRole.Admin,
            Active = true,
            CompanyId = company.Id,
            // Assign default temporary password
            PasswordHash = _passwordHasher.Hash(tempPassword)
        };

        _context.Companies.Add(company);
        _context.Users.Add(adminUser);

        await _context.SaveChangesAsync(cancellationToken);

        return new CompanyCreationResultDto
        {
            CompanyId = company.Id,
            TemporaryAdminPassword = tempPassword
        };
    }
}
