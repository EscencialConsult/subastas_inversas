using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SICST.Application.Common.Interfaces;
using SICST.Infrastructure.Arca;
using SICST.Infrastructure.Auctions;
using SICST.Infrastructure.Email;
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

        services.AddArcaServices(configuration);

        var arcaOptions = configuration.GetSection(ArcaOptions.SectionName).Get<ArcaOptions>();
        if (arcaOptions is not null && !string.IsNullOrWhiteSpace(arcaOptions.CertificatePath) && !string.IsNullOrWhiteSpace(arcaOptions.Cuit))
        {
            services.AddSingleton<IArcaVerificationService, ArcaVerificationService>();
        }
        else
        {
            services.AddSingleton<IArcaVerificationService, MockArcaVerificationService>();
        }
        services.AddSingleton<IAdvancedDigitalSignatureService, LocalAdvancedDigitalSignatureService>();
        var emailSection = configuration.GetSection(EmailOptions.SectionName);
        services.Configure<EmailOptions>(emailSection);
        var emailOptions = emailSection.Get<EmailOptions>();
        if (emailOptions is not null && !string.IsNullOrWhiteSpace(emailOptions.SmtpHost))
        {
            services.AddSingleton<IEmailSender, SmtpEmailSender>();
        }
        else
        {
            services.AddSingleton<IEmailSender, ConsoleEmailSender>();
        }
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

    public static IServiceCollection AddArcaServices(this IServiceCollection services, IConfiguration configuration)
    {
        var arcaSection = configuration.GetSection(ArcaOptions.SectionName);
        services.Configure<ArcaOptions>(arcaSection);

        services.AddSingleton<CmsGenerator>();

        services.AddHttpClient<WsaaClient>(client =>
        {
            var wsaaUrl = arcaSection.Get<ArcaOptions>()?.GetEffectiveWsaaUrl();
            if (!string.IsNullOrEmpty(wsaaUrl))
            {
                client.BaseAddress = new Uri(wsaaUrl);
            }
            client.DefaultRequestHeaders.Add("User-Agent", "SICST/1.0");
        });

        services.AddSingleton<TicketAccesoManager>();

        services.AddHttpClient<PadronA5Client>(client =>
        {
            var padronUrl = arcaSection.Get<ArcaOptions>()?.GetEffectivePadronUrl();
            if (!string.IsNullOrEmpty(padronUrl))
            {
                client.BaseAddress = new Uri(padronUrl);
            }
            client.DefaultRequestHeaders.Add("User-Agent", "SICST/1.0");
        });

        return services;
    }
}
