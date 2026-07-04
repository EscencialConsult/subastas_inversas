using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SICST.Application.Common.Interfaces;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;
using SICST.Persistence.Outbox;

namespace SICST.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistenceServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' or environment variable 'DATABASE_URL' is not configured.");
        }

        services.AddScoped<TenantSaveChangesInterceptor>();
        services.AddScoped<ImmutabilitySaveChangesInterceptor>();
        services.AddScoped<AuditSaveChangesInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString,
                b =>
                {
                    b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                    b.CommandTimeout(60);
                    b.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorCodesToAdd: null);
                });

            options.AddInterceptors(
                sp.GetRequiredService<TenantSaveChangesInterceptor>(),
                sp.GetRequiredService<ImmutabilitySaveChangesInterceptor>(),
                sp.GetRequiredService<AuditSaveChangesInterceptor>());
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IOutboxWriter, OutboxWriter>();

        return services;
    }

    private static string? ResolveConnectionString(IConfiguration configuration)
    {
        var databaseUrl = configuration["DATABASE_URL"];
        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            return NormalizeDatabaseUrl(databaseUrl);
        }

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        return string.IsNullOrWhiteSpace(connectionString)
            ? connectionString
            : NormalizeDatabaseUrl(connectionString);
    }

    private static string NormalizeDatabaseUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            (uri.Scheme != "postgres" && uri.Scheme != "postgresql"))
        {
            return value;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            Username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty,
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            SslMode = SslMode.Require
        };

        foreach (var parameter in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var parts = parameter.Split('=', 2);
            if (parts.Length != 2)
            {
                continue;
            }

            var name = Uri.UnescapeDataString(parts[0]).Replace('_', ' ');
            var parameterValue = Uri.UnescapeDataString(parts[1]);

            if (name.Equals("sslmode", StringComparison.OrdinalIgnoreCase) ||
                name.Equals("ssl mode", StringComparison.OrdinalIgnoreCase))
            {
                builder.SslMode = Enum.TryParse<SslMode>(parameterValue, ignoreCase: true, out var sslMode)
                    ? sslMode
                    : SslMode.Require;
                continue;
            }

            builder[name] = parameterValue;
        }

        return builder.ConnectionString;
    }
}
