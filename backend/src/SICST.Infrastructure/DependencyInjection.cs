using Microsoft.Extensions.DependencyInjection;
using SICST.Application.Common.Interfaces;
using SICST.Infrastructure.Auctions;
using SICST.Infrastructure.Security;

namespace SICST.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtProvider, JwtProvider>();
        services.AddSingleton<IAuctionStateCache, InMemoryAuctionStateCache>();
        return services;
    }
}
