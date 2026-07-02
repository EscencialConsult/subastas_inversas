using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SICST.Application.Common.Interfaces;
using SICST.Persistence.Contexts;
using SICST.Persistence.Interceptors;
using SICST.Persistence.Outbox;

namespace SICST.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistenceServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");
        }

        services.AddScoped<TenantSaveChangesInterceptor>();
        services.AddScoped<ImmutabilitySaveChangesInterceptor>();
        services.AddScoped<AuditSaveChangesInterceptor>();

        if (connectionString.Contains(".db") || connectionString.Contains("Data Source=") || connectionString.Contains("Filename="))
        {
            services.AddDbContext<ApplicationDbContext>((sp, options) =>
            {
                options.UseSqlite(connectionString,
                    b =>
                    {
                        b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                    });
                
                options.AddInterceptors(
                    sp.GetRequiredService<TenantSaveChangesInterceptor>(),
                    sp.GetRequiredService<ImmutabilitySaveChangesInterceptor>(),
                    sp.GetRequiredService<AuditSaveChangesInterceptor>());
            });
        }
        else
        {
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
        }

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IOutboxWriter, OutboxWriter>();

        return services;
    }
}
