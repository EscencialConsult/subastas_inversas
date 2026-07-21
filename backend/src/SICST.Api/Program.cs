using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SICST.Api.Auth;
using SICST.Api.Health;
using SICST.Api.Hubs;
using SICST.Api.Middlewares;
using SICST.Api.Observability;
using SICST.Api.Security;
using SICST.Api.Services;
using SICST.Api.Tenancy;
using SICST.Application;
using SICST.Application.Common.Security;
using SICST.Application.Common.Interfaces;
using SICST.Infrastructure;
using SICST.Persistence;
using SICST.Persistence.Contexts;
using Swashbuckle.AspNetCore.SwaggerGen;
using SICST.Api.Conventions;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "O";
});
builder.Logging.AddDebug();

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new ApiVersionRouteConvention());
});
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();
builder.Services.AddHostedService<AuctionSchedulerService>();
builder.Services.AddHostedService<SupplierArcaVerificationService>();
builder.Services.AddHostedService<OutboxDispatcherService>();
builder.Services.AddSingleton<IUploadStorage, LocalUploadStorage>();
builder.Services.AddSingleton<IAntivirusScanner, NoOpAntivirusScanner>();
builder.Services.AddScoped<IArcaVerificationAuditStore, ArcaVerificationAuditStore>();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready", "db"])
    .AddCheck<RedisHealthCheck>("redis", tags: ["ready", "cache"])
    .AddCheck<StorageHealthCheck>("storage", tags: ["ready", "uploads"])
    .AddCheck<AntivirusHealthCheck>("antivirus", tags: ["ready", "security"]);
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy(RateLimitPolicies.Login, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetClientPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
    options.AddPolicy(RateLimitPolicies.Mfa, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetClientPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(2),
            QueueLimit = 0
        }));
    options.AddPolicy(RateLimitPolicies.RefreshToken, context =>
        RateLimitPartition.GetFixedWindowLimiter(GetClientPartitionKey(context), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

if (builder.Environment.IsDevelopment())
{
    var keysPath = Path.Combine(Path.GetTempPath(), "sicst-dataprotection-keys");
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

var jwtIssuer = GetRequiredConfigurationValue(builder.Configuration, "Jwt:Issuer");
var jwtAudience = GetRequiredConfigurationValue(builder.Configuration, "Jwt:Audience");
var jwtSecret = GetRequiredConfigurationValue(builder.Configuration, "Jwt:Secret");
if (jwtSecret.Length < 32)
{
    throw new InvalidOperationException("Jwt:Secret must be at least 32 characters long.");
}

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("ConfiguredCors", policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()?
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .ToArray() ?? [];

        if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
        {
            allowedOrigins =
            [
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173"
            ];
        }

        if (allowedOrigins.Length == 0)
        {
            throw new InvalidOperationException("Cors:AllowedOrigins must be configured outside Development.");
        }

        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Register Clean Architecture layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddPersistenceServices(builder.Configuration);
builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

// Configure JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/auctions"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        }
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in new[]
    {
        PermissionCodes.CompaniesRead,
        PermissionCodes.CompaniesCreate,
        PermissionCodes.CompaniesUpdate,
        PermissionCodes.ConfigurationRead,
        PermissionCodes.ConfigurationManage,
        PermissionCodes.UsersManage,
        PermissionCodes.SuppliersManage,
        PermissionCodes.PurchasesManage,
        PermissionCodes.PurchasesApprove,
        PermissionCodes.PurchasesEvaluate,
        PermissionCodes.AuditRead
    })
    {
        options.AddPolicy(permission, policy => policy.Requirements.Add(new PermissionRequirement(permission)));
    }

    options.AddPolicy(PermissionCodes.PurchasesManageOrEvaluate, policy =>
        policy.Requirements.Add(new PermissionRequirement(
            PermissionCodes.PurchasesManage,
            PermissionCodes.PurchasesEvaluate)));
});

builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Configure Swagger with JWT Bearer security definition for Swashbuckle v10
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "SICST API", Version = "v1" });
    
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = new List<string>()
    });

    options.CustomOperationIds(apiDesc =>
    {
        return apiDesc.TryGetMethodInfo(out var methodInfo) ? methodInfo.Name : null;
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseRouting();
app.UseCors("ConfiguredCors");
app.UseRateLimiter();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RequestObservabilityMiddleware>();
app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication(); // Must be called before UseAuthorization()
app.UseAuthorization();

app.MapControllers();
app.MapHub<AuctionHub>("/hubs/auctions");
app.MapHealthChecks("/health/live", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = WriteHealthReport
});

if (ShouldInitializeDatabase(app.Configuration, app.Environment))
{
    using var initScope = app.Services.CreateScope();

    // Migración y sembrado se manejan por separado a propósito: si se los agrupa en un
    // solo try/catch, un fallo de la migración deja el sembrado sin ejecutar y la app
    // arranca igual con la base vacía, sin que nadie se entere.
    var migrationOk = false;
    try
    {
        var dbContext = initScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.MigrateAsync();
        migrationOk = true;
        app.Logger.LogInformation("Database migrations applied successfully.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(
            ex,
            "DATABASE MIGRATION FAILED. The schema may be incomplete and the app will not work correctly. " +
            "Check the connection string and the migration history before using the system.");
    }

    if (migrationOk)
    {
        try
        {
            var context = initScope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var passwordHasher = initScope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            await DatabaseInitializer.SeedAsync(context, passwordHasher);
            app.Logger.LogInformation("Database seeding completed successfully.");
        }
        catch (Exception ex)
        {
            app.Logger.LogError(
                ex,
                "DATABASE SEEDING FAILED. Initial data (including the superadmin user) may be missing, " +
                "so nobody will be able to log in.");
        }
    }
    else
    {
        app.Logger.LogError("Seeding skipped because the migration failed.");
    }
}

app.Run();

static string GetRequiredConfigurationValue(IConfiguration configuration, string key)
{
    var value = configuration[key];
    if (string.IsNullOrWhiteSpace(value))
    {
        throw new InvalidOperationException($"{key} must be configured through environment variables, user secrets, or a secret manager.");
    }

    return value;
}

static bool ShouldInitializeDatabase(IConfiguration configuration, IWebHostEnvironment environment)
{
    return configuration.GetValue<bool>("Database:InitializeOnStartup");
}

static Task WriteHealthReport(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";
    var payload = new
    {
        status = report.Status.ToString(),
        totalDurationMs = report.TotalDuration.TotalMilliseconds,
        entries = report.Entries.ToDictionary(
            entry => entry.Key,
            entry => new
            {
                status = entry.Value.Status.ToString(),
                description = entry.Value.Description,
                durationMs = entry.Value.Duration.TotalMilliseconds
            })
    };

    return context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web)));
}

static string GetClientPartitionKey(HttpContext context)
{
    var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    var clientIp = forwardedFor?.Split(',')[0].Trim();
    if (string.IsNullOrWhiteSpace(clientIp))
    {
        clientIp = context.Connection.RemoteIpAddress?.ToString();
    }

    return string.IsNullOrWhiteSpace(clientIp) ? "unknown-client" : clientIp;
}
