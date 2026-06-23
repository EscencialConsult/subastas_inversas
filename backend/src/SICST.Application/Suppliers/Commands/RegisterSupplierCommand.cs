using System.Text.RegularExpressions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.Commands;

public record RegisterSupplierCommand : IRequest<SupplierRegistrationResponseDto>
{
    public string BusinessName { get; init; } = string.Empty;
    public string Cuit { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Province { get; init; } = string.Empty;
    public string Locality { get; init; } = string.Empty;
}

public class RegisterSupplierCommandHandler : IRequestHandler<RegisterSupplierCommand, SupplierRegistrationResponseDto>
{
    private static readonly Regex CuitRegex = new(@"^\d{2}-?\d{8}-?\d$", RegexOptions.Compiled);

    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterSupplierCommandHandler(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<SupplierRegistrationResponseDto> Handle(RegisterSupplierCommand request, CancellationToken cancellationToken)
    {
        Validate(request);

        var email = request.Email.Trim().ToLower();
        var cuit = NormalizeCuit(request.Cuit);

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("Ya existe una cuenta con ese email.");
        }

        var cuitExists = await _context.Suppliers
            .AnyAsync(s => s.Cuit == cuit, cancellationToken);

        if (cuitExists)
        {
            throw new InvalidOperationException("Ya hay un proveedor registrado con ese CUIT.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            FirstName = request.BusinessName.Trim(),
            LastName = string.Empty,
            Role = UserRole.Proveedor,
            Active = true,
            CompanyId = null
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Cuit = cuit,
            BusinessName = request.BusinessName.Trim(),
            Email = email,
            Province = request.Province.Trim(),
            Locality = request.Locality.Trim(),
            Status = SupplierStatus.Pending,
            ArcaVerified = MockArcaVerification(cuit),
            CreatedAtUtc = DateTime.UtcNow
        };

        if (supplier.ArcaVerified)
        {
            supplier.Status = SupplierStatus.Verified;
        }

        _context.Users.Add(user);
        _context.Suppliers.Add(supplier);

        await _context.SaveChangesAsync(cancellationToken);

        return new SupplierRegistrationResponseDto
        {
            UserId = user.Id,
            SupplierId = supplier.Id
        };
    }

    private static void Validate(RegisterSupplierCommand request)
    {
        if (string.IsNullOrWhiteSpace(request.BusinessName))
        {
            throw new InvalidOperationException("La razon social es obligatoria.");
        }

        if (!CuitRegex.IsMatch(request.Cuit.Trim()))
        {
            throw new InvalidOperationException("El CUIT no tiene un formato valido.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
        {
            throw new InvalidOperationException("El email no tiene un formato valido.");
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            throw new InvalidOperationException("La contrasena debe tener al menos 6 caracteres.");
        }

        if (string.IsNullOrWhiteSpace(request.Province))
        {
            throw new InvalidOperationException("La provincia es obligatoria.");
        }

        if (string.IsNullOrWhiteSpace(request.Locality))
        {
            throw new InvalidOperationException("La localidad es obligatoria.");
        }
    }

    private static string NormalizeCuit(string cuit)
    {
        var digits = new string(cuit.Where(char.IsDigit).ToArray());
        return $"{digits[..2]}-{digits.Substring(2, 8)}-{digits[10..]}";
    }

    private static bool MockArcaVerification(string cuit)
    {
        return !cuit.EndsWith("-0", StringComparison.Ordinal);
    }
}
