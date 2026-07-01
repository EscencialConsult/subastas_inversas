using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Api.Auth;

public class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }

    public string Permission { get; }
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public PermissionAuthorizationHandler(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        IHttpContextAccessor httpContextAccessor)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var roleValue = context.User.FindFirstValue(ClaimTypes.Role);

        if (!Enum.TryParse<UserRole>(roleValue, out var role))
        {
            return;
        }

        if (!IsAuthorizedForRouteCompany(context.User, role))
        {
            return;
        }

        var cacheKey = $"role-permissions-{role}";

        var permissions = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30);

            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            return await dbContext.RolePermissions
                .Where(rp => rp.Role == role)
                .Select(rp => rp.Permission.Code)
                .ToListAsync();
        });

        if (permissions != null && permissions.Contains(requirement.Permission))
        {
            context.Succeed(requirement);
        }
    }

    private bool IsAuthorizedForRouteCompany(ClaimsPrincipal user, UserRole role)
    {
        if (role == UserRole.SuperAdmin)
        {
            return true;
        }

        var httpContext = _httpContextAccessor.HttpContext;
        var routeCompanyValue = httpContext?.Request.RouteValues["companyId"]?.ToString();
        if (string.IsNullOrWhiteSpace(routeCompanyValue))
        {
            return true;
        }

        var claimCompanyValue = user.FindFirstValue("companyId");
        return Guid.TryParse(routeCompanyValue, out var routeCompanyId) &&
            Guid.TryParse(claimCompanyValue, out var claimCompanyId) &&
            routeCompanyId == claimCompanyId;
    }
}
