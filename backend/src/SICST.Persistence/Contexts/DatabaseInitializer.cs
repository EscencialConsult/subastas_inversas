using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Security;
using SICST.Domain.Entities;

namespace SICST.Persistence.Contexts;

public static class DatabaseInitializer
{
    public static async Task SeedAsync(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        if (context is DbContext dbContext)
        {
            if (!dbContext.Database.IsRelational())
            {
                await dbContext.Database.EnsureCreatedAsync();
            }
        }

        if (!await context.Users.AnyAsync())
        {
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Email = "admin@sicst.com",
                FirstName = "Super",
                LastName = "Admin",
                PasswordHash = passwordHasher.Hash("Admin123!"),
                Role = UserRole.SuperAdmin,
                Active = true,
                CompanyId = null
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync(CancellationToken.None);
        }

        await SeedPermissionsAsync(context);
        await SeedDemoDataAsync(context, passwordHasher);
    }

    private static async Task SeedPermissionsAsync(IApplicationDbContext context)
    {
        var definitions = new Dictionary<string, string>
        {
            [PermissionCodes.CompaniesRead] = "Ver empresas",
            [PermissionCodes.CompaniesCreate] = "Crear empresas",
            [PermissionCodes.CompaniesUpdate] = "Actualizar empresas",
            [PermissionCodes.ConfigurationRead] = "Ver configuracion de empresa",
            [PermissionCodes.ConfigurationManage] = "Gestionar configuracion de empresa",
            [PermissionCodes.UsersManage] = "Gestionar usuarios",
            [PermissionCodes.SuppliersManage] = "Gestionar proveedores",
            [PermissionCodes.PurchasesManage] = "Gestionar procesos de compra",
            [PermissionCodes.PurchasesApprove] = "Aprobar procesos de compra",
            [PermissionCodes.PurchasesEvaluate] = "Evaluar procesos de compra",
            [PermissionCodes.AuditRead] = "Consultar auditoria"
        };

        foreach (var definition in definitions)
        {
            if (!await context.Permissions.AnyAsync(p => p.Code == definition.Key))
            {
                context.Permissions.Add(new Permission
                {
                    Id = Guid.NewGuid(),
                    Code = definition.Key,
                    Description = definition.Value
                });
            }
        }

        await context.SaveChangesAsync(CancellationToken.None);

        var permissions = await context.Permissions.ToDictionaryAsync(p => p.Code);
        var rolePermissions = new Dictionary<UserRole, string[]>
        {
            [UserRole.SuperAdmin] = definitions.Keys.ToArray(),
            [UserRole.Admin] =
            [
                PermissionCodes.UsersManage,
                PermissionCodes.ConfigurationRead,
                PermissionCodes.ConfigurationManage,
                PermissionCodes.SuppliersManage,
                PermissionCodes.PurchasesManage,
                PermissionCodes.PurchasesApprove,
                PermissionCodes.PurchasesEvaluate,
                PermissionCodes.AuditRead
            ],
            [UserRole.Comprador] =
            [
                PermissionCodes.PurchasesManage,
                PermissionCodes.ConfigurationRead
            ],
            [UserRole.Proveedor] = [],
            [UserRole.Evaluador] = [PermissionCodes.PurchasesEvaluate],
            [UserRole.Auditor] = [PermissionCodes.AuditRead],
            [UserRole.Autoridad] = [PermissionCodes.PurchasesApprove]
        };

        foreach (var rolePermission in rolePermissions)
        {
            foreach (var code in rolePermission.Value)
            {
                var permissionId = permissions[code].Id;
                var exists = await context.RolePermissions
                    .AnyAsync(rp => rp.Role == rolePermission.Key && rp.PermissionId == permissionId);

                if (!exists)
                {
                    context.RolePermissions.Add(new RolePermission
                    {
                        Id = Guid.NewGuid(),
                        Role = rolePermission.Key,
                        PermissionId = permissionId
                    });
                }
            }
        }

        await context.SaveChangesAsync(CancellationToken.None);
    }

    private static async Task SeedDemoDataAsync(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        // 1. Seed demo company (tenant)
        var demoCompany = await context.Companies.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Domain == "prueba.com");
        if (demoCompany == null)
        {
            demoCompany = new Company
            {
                Id = Guid.NewGuid(),
                Name = "Organismo de Prueba",
                Domain = "prueba.com",
                Logo = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png",
                PrimaryColor = "#0055AA",
                IsPublicEntity = true
            };
            context.Companies.Add(demoCompany);
            await context.SaveChangesAsync(CancellationToken.None);

            // Create Company Configuration
            var config = new CompanyConfiguration
            {
                Id = Guid.NewGuid(),
                CompanyId = demoCompany.Id,
                DefaultCurrency = "ARS",
                TimeZone = "America/Argentina/Buenos_Aires",
                MinimumBidDecrementPercentage = 1,
                AuctionExtensionMinutes = 2,
                RequireSupplierVerification = true,
                UpdatedAtUtc = DateTime.UtcNow
            };
            context.CompanyConfigurations.Add(config);

            // Create Contracting Modes
            var mode = new ContractingMode
            {
                Id = Guid.NewGuid(),
                CompanyId = demoCompany.Id,
                Name = "Subasta Inversa",
                Description = "Procedimiento de subasta inversa",
                MinAmount = 0,
                MaxAmount = null,
                RequiresAuction = true,
                Active = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            context.ContractingModes.Add(mode);
            await context.SaveChangesAsync(CancellationToken.None);
        }

        // 2. Seed Users
        var demoUsers = new List<(string Email, string FirstName, string LastName, UserRole Role, Guid? CompanyId)>
        {
            ("admin@prueba.com", "Admin", "Tenant", UserRole.Admin, demoCompany.Id),
            ("usuario1@prueba.com", "Juan", "Comprador", UserRole.Comprador, demoCompany.Id),
            ("usuario2@prueba.com", "Pedro", "Evaluador", UserRole.Evaluador, demoCompany.Id),
            ("usuario3@prueba.com", "Maria", "Autoridad", UserRole.Autoridad, demoCompany.Id),
            ("usuario4@prueba.com", "Lucia", "Auditor", UserRole.Auditor, demoCompany.Id),
            ("ventas@kotler.com", "Carlos", "Proveedor", UserRole.Proveedor, null)
        };

        foreach (var u in demoUsers)
        {
            var userExists = await context.Users.IgnoreQueryFilters().AnyAsync(user => user.Email == u.Email);
            if (!userExists)
            {
                var newUser = new User
                {
                    Id = Guid.NewGuid(),
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    PasswordHash = passwordHasher.Hash("123456"),
                    Role = u.Role,
                    Active = true,
                    CompanyId = u.CompanyId
                };
                context.Users.Add(newUser);
                await context.SaveChangesAsync(CancellationToken.None);

                // If role is Proveedor, also create the Supplier entity!
                if (u.Role == UserRole.Proveedor)
                {
                    var supplier = new Supplier
                    {
                        Id = Guid.NewGuid(),
                        UserId = newUser.Id,
                        Cuit = "30-12345678-1",
                        BusinessName = "Kotler S.A.",
                        Email = u.Email,
                        BusinessCategory = "Servicios de IT e Insumos",
                        Province = "Buenos Aires",
                        Locality = "CABA",
                        Status = SupplierStatus.Verified,
                        ArcaVerified = true,
                        ArcaVerificationStatus = ArcaVerificationStatus.Verified,
                        CreatedAtUtc = DateTime.UtcNow
                    };
                    context.Suppliers.Add(supplier);
                    await context.SaveChangesAsync(CancellationToken.None);
                }
            }
        }
    }
}
