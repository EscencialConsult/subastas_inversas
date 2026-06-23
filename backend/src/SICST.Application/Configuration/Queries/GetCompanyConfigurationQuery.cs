using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;

namespace SICST.Application.Configuration.Queries;

public record GetCompanyConfigurationQuery(Guid CompanyId) : IRequest<CompanyConfigurationDto?>;

public class GetCompanyConfigurationQueryHandler : IRequestHandler<GetCompanyConfigurationQuery, CompanyConfigurationDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCompanyConfigurationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CompanyConfigurationDto?> Handle(GetCompanyConfigurationQuery request, CancellationToken cancellationToken)
    {
        var companyExists = await _context.Companies.AnyAsync(c => c.Id == request.CompanyId, cancellationToken);
        if (!companyExists)
        {
            return null;
        }

        var configuration = await _context.CompanyConfigurations
            .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId, cancellationToken);

        if (configuration == null)
        {
            return new CompanyConfigurationDto
            {
                Id = Guid.Empty,
                CompanyId = request.CompanyId,
                DefaultCurrency = "ARS",
                TimeZone = "America/Argentina/Buenos_Aires",
                MinimumBidDecrementPercentage = 1,
                AuctionExtensionMinutes = 2,
                RequireSupplierVerification = true
            };
        }

        return new CompanyConfigurationDto
        {
            Id = configuration.Id,
            CompanyId = configuration.CompanyId,
            DefaultCurrency = configuration.DefaultCurrency,
            TimeZone = configuration.TimeZone,
            MinimumBidDecrementPercentage = configuration.MinimumBidDecrementPercentage,
            AuctionExtensionMinutes = configuration.AuctionExtensionMinutes,
            RequireSupplierVerification = configuration.RequireSupplierVerification
        };
    }
}
