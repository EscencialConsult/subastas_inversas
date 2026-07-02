using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using SICST.Application.Modules.Identity.Auth.DTOs;
using SICST.Application.Common.Models;
using SICST.Application.Modules.Purchases.DTOs;

namespace SICST.Tests.Integration;

public class AuthTenantIntegrationTests : IClassFixture<SicstApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly SicstApiFactory _factory;

    public AuthTenantIntegrationTests(SicstApiFactory factory)
    {
        _factory = factory;
    }

    [TestcontainersFact]
    public async Task Login_ShouldReturnAccessAndRefreshTokens()
    {
        await _factory.SeedScenarioAsync();
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "comprador.a@tests.local",
            password = "Test123!"
        });

        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponseDto>(JsonOptions);

        Assert.NotNull(auth);
        Assert.Equal(SicstApiFactory.BuyerAId, auth.UserId);
        Assert.Equal(SicstApiFactory.TenantAId, auth.CompanyId);
        Assert.False(string.IsNullOrWhiteSpace(auth.Token));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));
    }

    [TestcontainersFact]
    public async Task PurchaseProcesses_ShouldReturnOnlyRequestedTenantData_WhenAuthenticatedForTenant()
    {
        await _factory.SeedScenarioAsync();
        using var client = _factory.CreateClient();
        var token = await LoginAndGetToken(client);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/companies/{SicstApiFactory.TenantAId}/purchase-processes?pageSize=20");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-Tenant-Domain", "tenant-a");

        var response = await client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var page = await response.Content.ReadFromJsonAsync<PagedResult<PurchaseProcessDto>>(JsonOptions);

        Assert.NotNull(page);
        Assert.Contains(page.Items, item => item.Id == SicstApiFactory.ProcessAId);
        Assert.DoesNotContain(page.Items, item => item.Id == SicstApiFactory.ProcessBId);
        Assert.All(page.Items, item => Assert.Equal(SicstApiFactory.TenantAId, item.CompanyId));
    }

    [TestcontainersFact]
    public async Task PurchaseProcesses_ShouldRejectCrossTenantRouteAccess()
    {
        await _factory.SeedScenarioAsync();
        using var client = _factory.CreateClient();
        var token = await LoginAndGetToken(client);

        using var request = new HttpRequestMessage(HttpMethod.Get, $"/api/companies/{SicstApiFactory.TenantBId}/purchase-processes?pageSize=20");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-Tenant-Domain", "tenant-b");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<string> LoginAndGetToken(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "comprador.a@tests.local",
            password = "Test123!"
        });

        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponseDto>(JsonOptions);
        return auth?.Token ?? throw new InvalidOperationException("Login did not return an access token.");
    }
}
