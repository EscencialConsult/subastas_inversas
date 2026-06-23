using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Api.Tenancy;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext httpContext,
        IApplicationDbContext dbContext,
        ICurrentTenant currentTenant)
    {
        var domain = ResolveTenantDomain(httpContext);

        if (!string.IsNullOrWhiteSpace(domain))
        {
            var company = await dbContext.Companies
                .FirstOrDefaultAsync(c => c.Domain.ToLower() == domain.ToLower());

            if (company != null)
            {
                currentTenant.CompanyId = company.Id;
                currentTenant.Domain = company.Domain;
                currentTenant.Company = company;
            }
        }

        await _next(httpContext);
    }

    private static string? ResolveTenantDomain(HttpContext httpContext)
    {
        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Domain", out var tenantHeader))
        {
            return tenantHeader.ToString();
        }

        var host = httpContext.Request.Host.Host;
        if (string.IsNullOrWhiteSpace(host) || host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var labels = host.Split('.', StringSplitOptions.RemoveEmptyEntries);
        if (labels.Length < 3)
        {
            return null;
        }

        return labels[0];
    }
}
