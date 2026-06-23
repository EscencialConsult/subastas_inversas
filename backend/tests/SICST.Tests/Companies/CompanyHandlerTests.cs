using Microsoft.EntityFrameworkCore;
using SICST.Application.Companies.Commands;
using SICST.Application.Companies.Queries;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Companies;

public class CompanyHandlerTests
{
    private ApplicationDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        var context = new ApplicationDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }

    [Fact]
    public async Task CreateCompany_ShouldPersistAndReturnGuid()
    {
        // Arrange
        using var context = CreateDbContext();
        var handler = new CreateCompanyCommandHandler(context);
        var command = new CreateCompanyCommand
        {
            Name = "Test Company",
            Domain = "test.com",
            Logo = "https://cdn.test/logo.png",
            PrimaryColor = "#0055AA",
            IsPublicEntity = true
        };

        // Act
        var resultId = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotEqual(Guid.Empty, resultId);
        var created = await context.Companies.FindAsync(resultId);
        Assert.NotNull(created);
        Assert.Equal("Test Company", created.Name);
        Assert.Equal("test.com", created.Domain);
        Assert.Equal("https://cdn.test/logo.png", created.Logo);
        Assert.Equal("#0055AA", created.PrimaryColor);
        Assert.True(created.IsPublicEntity);
    }

    [Fact]
    public async Task GetCompanies_ShouldReturnAllEntities()
    {
        // Arrange
        using var context = CreateDbContext();
        var handler = new GetCompaniesQueryHandler(context);
        
        context.Companies.AddRange(new[]
        {
            new Domain.Entities.Company { Id = Guid.NewGuid(), Name = "Co A", Domain = "a.com" },
            new Domain.Entities.Company { Id = Guid.NewGuid(), Name = "Co B", Domain = "b.com" }
        });
        await context.SaveChangesAsync();

        // Act
        var result = await handler.Handle(new GetCompaniesQuery(), CancellationToken.None);

        // Assert
        Assert.Equal(2, result.Items.Count);
        Assert.Contains(result.Items, c => c.Name == "Co A");
        Assert.Contains(result.Items, c => c.Name == "Co B");
    }

    [Fact]
    public async Task GetCompanyById_ShouldReturnCorrectEntity_WhenExists()
    {
        // Arrange
        using var context = CreateDbContext();
        var targetId = Guid.NewGuid();
        context.Companies.Add(new Domain.Entities.Company { Id = targetId, Name = "Target Co", Domain = "target.com" });
        await context.SaveChangesAsync();

        var handler = new GetCompanyByIdQueryHandler(context);

        // Act
        var result = await handler.Handle(new GetCompanyByIdQuery(targetId), CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(targetId, result.Id);
        Assert.Equal("Target Co", result.Name);
    }

    [Fact]
    public async Task GetCompanyById_ShouldReturnNull_WhenNotExists()
    {
        // Arrange
        using var context = CreateDbContext();
        var handler = new GetCompanyByIdQueryHandler(context);

        // Act
        var result = await handler.Handle(new GetCompanyByIdQuery(Guid.NewGuid()), CancellationToken.None);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateCompany_ShouldModifyEntity_WhenExists()
    {
        // Arrange
        using var context = CreateDbContext();
        var targetId = Guid.NewGuid();
        var company = new Domain.Entities.Company { Id = targetId, Name = "Original Co", Domain = "original.com", IsPublicEntity = false };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var handler = new UpdateCompanyCommandHandler(context);
        var command = new UpdateCompanyCommand
        {
            Id = targetId,
            Name = "Updated Co",
            Domain = "updated.com",
            Logo = "https://cdn.test/updated-logo.png",
            PrimaryColor = "#00AA55",
            IsPublicEntity = true
        };

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.True(result);
        
        // Fetch fresh copy from context
        context.Entry(company).State = EntityState.Detached; // Avoid local cache
        var updated = await context.Companies.FindAsync(targetId);
        Assert.NotNull(updated);
        Assert.Equal("Updated Co", updated.Name);
        Assert.Equal("updated.com", updated.Domain);
        Assert.Equal("https://cdn.test/updated-logo.png", updated.Logo);
        Assert.Equal("#00AA55", updated.PrimaryColor);
        Assert.True(updated.IsPublicEntity);
    }

    [Fact]
    public async Task UpdateCompany_ShouldReturnFalse_WhenNotExists()
    {
        // Arrange
        using var context = CreateDbContext();
        var handler = new UpdateCompanyCommandHandler(context);
        var command = new UpdateCompanyCommand
        {
            Id = Guid.NewGuid(),
            Name = "Non-existent Co",
            Domain = "none.com",
            IsPublicEntity = false
        };

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.False(result);
    }
}
