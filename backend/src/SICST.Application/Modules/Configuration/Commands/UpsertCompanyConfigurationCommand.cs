using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Configuration.Commands;

public record UpsertCompanyConfigurationCommand : IRequest<CompanyConfigurationDto>
{
    public Guid CompanyId { get; init; }
    public string DefaultCurrency { get; init; } = "ARS";
    public string TimeZone { get; init; } = "America/Argentina/Buenos_Aires";
    public decimal MinimumBidDecrementPercentage { get; init; } = 1;
    public int AuctionExtensionMinutes { get; init; } = 2;
    public bool RequireSupplierVerification { get; init; } = true;
}

public class UpsertCompanyConfigurationCommandHandler : IRequestHandler<UpsertCompanyConfigurationCommand, CompanyConfigurationDto>
{
    private readonly IApplicationDbContext _context;

    public UpsertCompanyConfigurationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CompanyConfigurationDto> Handle(UpsertCompanyConfigurationCommand request, CancellationToken cancellationToken)
    {
        await EnsureCompanyExists(request.CompanyId, cancellationToken);
        Validate(request);

        var entity = await _context.CompanyConfigurations
            .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId, cancellationToken);

        if (entity == null)
        {
            entity = new CompanyConfiguration
            {
                Id = Guid.NewGuid(),
                CompanyId = request.CompanyId
            };

            _context.CompanyConfigurations.Add(entity);
        }

        entity.DefaultCurrency = request.DefaultCurrency.Trim().ToUpper();
        entity.TimeZone = request.TimeZone.Trim();
        entity.MinimumBidDecrementPercentage = request.MinimumBidDecrementPercentage;
        entity.AuctionExtensionMinutes = request.AuctionExtensionMinutes;
        entity.RequireSupplierVerification = request.RequireSupplierVerification;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new CompanyConfigurationDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            DefaultCurrency = entity.DefaultCurrency,
            TimeZone = entity.TimeZone,
            MinimumBidDecrementPercentage = entity.MinimumBidDecrementPercentage,
            AuctionExtensionMinutes = entity.AuctionExtensionMinutes,
            RequireSupplierVerification = entity.RequireSupplierVerification
        };
    }

    private async Task EnsureCompanyExists(Guid companyId, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == companyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }
    }

    private static void Validate(UpsertCompanyConfigurationCommand request)
    {
        if (string.IsNullOrWhiteSpace(request.DefaultCurrency) || request.DefaultCurrency.Trim().Length != 3)
        {
            throw new InvalidOperationException("La moneda debe tener tres caracteres ISO.");
        }

        if (string.IsNullOrWhiteSpace(request.TimeZone))
        {
            throw new InvalidOperationException("La zona horaria es obligatoria.");
        }

        if (request.MinimumBidDecrementPercentage <= 0)
        {
            throw new InvalidOperationException("El decremento minimo debe ser mayor a cero.");
        }

        if (request.AuctionExtensionMinutes < 0)
        {
            throw new InvalidOperationException("La extension de subasta no puede ser negativa.");
        }
    }
}
