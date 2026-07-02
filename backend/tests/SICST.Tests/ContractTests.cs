using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace SICST.Tests;

public class ContractTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ContractTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SwaggerOpenApiContract_ShouldBeValidAndExposeCriticalEndpoints()
    {
        // Arrange
        using var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/swagger/v1/swagger.json");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var jsonContent = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(jsonContent);
        
        var paths = doc.RootElement.GetProperty("paths");

        // Verify that critical versioned and auth endpoints exist in the API Contract
        Assert.True(paths.TryGetProperty("/api/v1/Auth/login", out _), "Auth Login route should exist");
        Assert.True(paths.TryGetProperty("/api/v1/companies/{companyId}/purchase-processes", out _), "Purchase processes route should exist");
        Assert.True(paths.TryGetProperty("/api/v1/companies/{companyId}/contracts/{contractId}/payments", out _), "Contract payments route should exist");
        Assert.True(paths.TryGetProperty("/audit/events/access-logs", out _), "Audit access logs route should exist");
    }
}
