using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Security;
using SICST.Domain.Entities;

namespace SICST.Persistence.Contexts;

public static class DatabaseInitializer
{
    public static async Task SeedAsync(IApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        // Automatically run migrations if needed (optional, but convenient)
        if (context is DbContext dbContext)
        {
            await dbContext.Database.MigrateAsync();
        }

        // Seed default SuperAdmin if table is empty
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
            [UserRole.Comprador] = [PermissionCodes.PurchasesManage],
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
        if (await context.Companies.AnyAsync())
        {
            return;
        }

        // 1. Seed Company
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Gobierno de Prueba",
            Domain = "prueba.gov.ar",
            IsPublicEntity = true
        };
        context.Companies.Add(company);

        // 2. Seed Users
        var tenantAdmin = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = "admin@prueba.gov.ar",
            FirstName = "Admin",
            LastName = "Tenant",
            PasswordHash = passwordHasher.Hash("Admin123!"),
            Role = UserRole.Admin,
            Active = true
        };

        var comprador = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = "comprador@prueba.gov.ar",
            FirstName = "Juan",
            LastName = "Comprador",
            PasswordHash = passwordHasher.Hash("Comprador123!"),
            Role = UserRole.Comprador,
            Active = true
        };

        var autoridad = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = "autoridad@prueba.gov.ar",
            FirstName = "Marta",
            LastName = "Autoridad",
            PasswordHash = passwordHasher.Hash("Autoridad123!"),
            Role = UserRole.Autoridad,
            Active = true
        };

        var evaluador = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = "evaluador@prueba.gov.ar",
            FirstName = "Lucas",
            LastName = "Evaluador",
            PasswordHash = passwordHasher.Hash("Evaluador123!"),
            Role = UserRole.Evaluador,
            Active = true
        };

        var auditor = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Email = "auditor@prueba.gov.ar",
            FirstName = "Clara",
            LastName = "Auditora",
            PasswordHash = passwordHasher.Hash("Auditor123!"),
            Role = UserRole.Auditor,
            Active = true
        };

        context.Users.AddRange(tenantAdmin, comprador, autoridad, evaluador, auditor);

        // 3. Seed Company Configuration
        var config = new CompanyConfiguration
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            DefaultCurrency = "ARS",
            TimeZone = "America/Argentina/Buenos_Aires",
            MinimumBidDecrementPercentage = 1,
            AuctionExtensionMinutes = 3,
            RequireSupplierVerification = true,
            UpdatedAtUtc = DateTime.UtcNow
        };
        context.CompanyConfigurations.Add(config);

        // 4. Seed Supplier 1
        var supplierUser1 = new User
        {
            Id = Guid.NewGuid(),
            Email = "proveedor1@prueba.com",
            FirstName = "Soporte",
            LastName = "IT",
            PasswordHash = passwordHasher.Hash("Proveedor123!"),
            Role = UserRole.Proveedor,
            Active = true
        };
        var supplier1 = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = supplierUser1.Id,
            BusinessName = "Insumos Tecnológicos S.A.",
            Cuit = "30-12345678-1",
            Email = "proveedor1@prueba.com",
            Province = "Buenos Aires",
            Locality = "CABA",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        // 5. Seed Supplier 2
        var supplierUser2 = new User
        {
            Id = Guid.NewGuid(),
            Email = "proveedor2@prueba.com",
            FirstName = "Ventas",
            LastName = "Papelera",
            PasswordHash = passwordHasher.Hash("Proveedor123!"),
            Role = UserRole.Proveedor,
            Active = true
        };
        var supplier2 = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = supplierUser2.Id,
            BusinessName = "Papelera Distribuidora SRL",
            Cuit = "30-76543210-9",
            Email = "proveedor2@prueba.com",
            Province = "Córdoba",
            Locality = "Córdoba",
            Status = SupplierStatus.Verified,
            ArcaVerified = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.AddRange(supplierUser1, supplierUser2);
        context.Suppliers.AddRange(supplier1, supplier2);

        // 6. Seed contracting mode
        var contractingMode = new ContractingMode
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            Name = "Licitación Pública",
            Description = "Licitación pública de prueba",
            RequiresAuction = true,
            Active = true,
            CreatedAtUtc = DateTime.UtcNow
        };
        context.ContractingModes.Add(contractingMode);

        await context.SaveChangesAsync(CancellationToken.None);
    }
}
