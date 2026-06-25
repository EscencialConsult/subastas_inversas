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
            if (dbContext.Database.IsRelational())
            {
                await dbContext.Database.MigrateAsync();
            }
            else
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
}
