using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SICST.Api.Auth;
using SICST.Api.Hubs;
using SICST.Api.Middlewares;
using SICST.Api.Services;
using SICST.Api.Tenancy;
using SICST.Application;
using SICST.Application.Common.Security;
using SICST.Application.Common.Interfaces;
using SICST.Infrastructure;
using SICST.Persistence;
using SICST.Persistence.Contexts;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();
builder.Services.AddHostedService<AuctionSchedulerService>();
builder.Services.AddHostedService<SupplierArcaVerificationService>();

if (builder.Environment.IsDevelopment())
{
    var keysPath = Path.Combine(Path.GetTempPath(), "sicst-dataprotection-keys");
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register Clean Architecture layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddPersistenceServices(builder.Configuration);

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
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
            builder.Configuration["Jwt:Secret"] ?? "super_secret_key_that_is_at_least_32_characters_long!"))
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
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll"); // Must be called before UseRouting/UseEndpoints/UseAuthentication/UseAuthorization

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseMiddleware<ErrorHandlingMiddleware>();
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication(); // Must be called before UseAuthorization()
app.UseAuthorization();

app.MapControllers();
app.MapHub<AuctionHub>("/hubs/auctions");

// Seed Database on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await dbContext.Database.MigrateAsync();

    var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
    await DatabaseInitializer.SeedAsync(context, passwordHasher);
}

app.Run();




