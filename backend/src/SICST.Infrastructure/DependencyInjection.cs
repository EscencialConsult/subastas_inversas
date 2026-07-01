using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SICST.Application.Common.Interfaces;
using SICST.Infrastructure.Auctions;
using SICST.Infrastructure.Security;
using SICST.Infrastructure.Services;
using StackExchange.Redis;

namespace SICST.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtProvider, JwtProvider>();
        services.AddSingleton<IMfaProvider, TotpMfaProvider>();
        services.AddSingleton<IAuctionStateCache, InMemoryAuctionStateCache>();
        services.AddSingleton<IArcaVerificationService, MockArcaVerificationService>();
        services.AddSingleton<IDgrTaxComplianceService, MockDgrTaxComplianceService>();
        services.AddSingleton<IRepsalComplianceService, MockRepsalComplianceService>();
        services.AddSingleton<IAdvancedDigitalSignatureService, LocalAdvancedDigitalSignatureService>();
        services.AddSingleton<IEmailSender, ConsoleEmailSender>();
        var redisConnectionString = configuration["Redis:ConnectionString"];
        if (!string.IsNullOrWhiteSpace(redisConnectionString))
        {
            services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnectionString));
            services.AddSingleton<IAuctionBidLock, RedisAuctionBidLock>();
            services.AddSingleton<IPublicAuctionSnapshotCache, RedisPublicAuctionSnapshotCache>();
        }
        else
        {
            services.AddSingleton<IAuctionBidLock, InMemoryAuctionBidLock>();
            services.AddSingleton<IPublicAuctionSnapshotCache, InMemoryPublicAuctionSnapshotCache>();
        }

        services.AddScoped<IPdfGenerator, PdfGenerator>();
        return services;
    }
}
