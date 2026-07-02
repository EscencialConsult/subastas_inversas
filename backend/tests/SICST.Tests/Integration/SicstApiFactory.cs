using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using DotNet.Testcontainers.Builders;
using Testcontainers.PostgreSql;

namespace SICST.Tests.Integration;

public sealed class SicstApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public static readonly Guid TenantAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    public static readonly Guid TenantBId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    public static readonly Guid BuyerAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-000000000001");
    public static readonly Guid BuyerBId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-000000000001");
    public static readonly Guid ProcessAId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-000000000101");
    public static readonly Guid ProcessBId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-000000000101");

    private PostgreSqlContainer? _postgres;
    private string? _connectionString;
    private bool _seeded;
    private string? _dockerUnavailableReason;

    public async Task InitializeAsync()
    {
        try
        {
            _postgres = new PostgreSqlBuilder("postgres:16-alpine")
                .WithDatabase("sicst_tests")
                .WithUsername("sicst")
                .WithPassword("sicst")
                .Build();

            await _postgres.StartAsync();
            _connectionString = _postgres.GetConnectionString();
        }
        catch (DockerUnavailableException ex)
        {
            _dockerUnavailableReason = ex.Message;
        }
    }

    public new async Task DisposeAsync()
    {
        if (_postgres != null)
        {
            await _postgres.DisposeAsync();
        }

        await base.DisposeAsync();
    }

    public async Task SeedScenarioAsync()
    {
        if (_dockerUnavailableReason != null)
        {
            throw new InvalidOperationException($"Docker/Testcontainers no disponible: {_dockerUnavailableReason}");
        }

        if (_seeded)
        {
            return;
        }

        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

        await context.Database.MigrateAsync();

        if (!await context.Companies.IgnoreQueryFilters().AnyAsync(c => c.Id == TenantAId))
        {
            context.Companies.AddRange(
                new Company
                {
                    Id = TenantAId,
                    Name = "Tenant A",
                    Domain = "tenant-a",
                    IsPublicEntity = true
                },
                new Company
                {
                    Id = TenantBId,
                    Name = "Tenant B",
                    Domain = "tenant-b",
                    IsPublicEntity = true
                });
        }

        if (!await context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == BuyerAId))
        {
            context.Users.AddRange(
                new User
                {
                    Id = BuyerAId,
                    Email = "comprador.a@tests.local",
                    PasswordHash = passwordHasher.Hash("Test123!"),
                    FirstName = "Comprador",
                    LastName = "A",
                    Role = UserRole.Comprador,
                    Active = true,
                    CompanyId = TenantAId
                },
                new User
                {
                    Id = BuyerBId,
                    Email = "comprador.b@tests.local",
                    PasswordHash = passwordHasher.Hash("Test123!"),
                    FirstName = "Comprador",
                    LastName = "B",
                    Role = UserRole.Comprador,
                    Active = true,
                    CompanyId = TenantBId
                });
        }

        if (!await context.PurchaseProcesses.IgnoreQueryFilters().AnyAsync(p => p.Id == ProcessAId))
        {
            context.PurchaseProcesses.AddRange(
                new PurchaseProcess
                {
                    Id = ProcessAId,
                    CompanyId = TenantAId,
                    BuyerId = BuyerAId,
                    Code = "PC-A-0001",
                    Title = "Proceso visible tenant A",
                    Description = "Proceso seed para pruebas de integracion.",
                    EstimatedBudget = 1000,
                    Status = PurchaseProcessStatus.Draft,
                    CreatedAtUtc = DateTime.UtcNow.AddMinutes(-10),
                    Items =
                    [
                        new PurchaseItem
                        {
                            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-000000000201"),
                            Description = "Item A",
                            Quantity = 1,
                            Unit = "unidad",
                            EstimatedUnitPrice = 1000
                        }
                    ]
                },
                new PurchaseProcess
                {
                    Id = ProcessBId,
                    CompanyId = TenantBId,
                    BuyerId = BuyerBId,
                    Code = "PC-B-0001",
                    Title = "Proceso visible tenant B",
                    Description = "Proceso seed para pruebas cross-tenant.",
                    EstimatedBudget = 2000,
                    Status = PurchaseProcessStatus.Draft,
                    CreatedAtUtc = DateTime.UtcNow.AddMinutes(-5),
                    Items =
                    [
                        new PurchaseItem
                        {
                            Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-000000000201"),
                            Description = "Item B",
                            Quantity = 1,
                            Unit = "unidad",
                            EstimatedUnitPrice = 2000
                        }
                    ]
                });
        }

        await context.SaveChangesAsync();
        _seeded = true;
    }

    protected override void ConfigureWebHost(Microsoft.AspNetCore.Hosting.IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = _connectionString ?? "Host=localhost;Database=sicst_tests_unavailable;Username=sicst;Password=sicst",
                ["Jwt:Issuer"] = "SICST.Tests",
                ["Jwt:Audience"] = "SICST.Tests",
                ["Jwt:Secret"] = "integration_test_secret_key_that_is_at_least_32_characters",
                ["Jwt:AccessTokenMinutes"] = "15",
                ["Cors:AllowedOrigins:0"] = "http://localhost"
            });
        });
    }
}
