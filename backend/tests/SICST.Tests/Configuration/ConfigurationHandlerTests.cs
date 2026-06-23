using Microsoft.EntityFrameworkCore;
using SICST.Application.Configuration.Commands;
using SICST.Application.Configuration.Queries;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;
using Xunit;

namespace SICST.Tests.Configuration;

public class ConfigurationHandlerTests
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
    public async Task CreateContractingMode_ShouldPersistMode()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var handler = new CreateContractingModeCommandHandler(context);

        var result = await handler.Handle(new CreateContractingModeCommand
        {
            CompanyId = companyId,
            Name = "Subasta inversa",
            Description = "Competencia por menor precio",
            RequiresAuction = true
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.True(result.RequiresAuction);

        var modes = await new GetContractingModesQueryHandler(context)
            .Handle(new GetContractingModesQuery(companyId), CancellationToken.None);

        Assert.Single(modes);
        Assert.Equal("Subasta inversa", modes[0].Name);
    }

    [Fact]
    public async Task CreateApprovalWorkflow_ShouldValidateAmountsAndPersist()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var handler = new CreateApprovalWorkflowCommandHandler(context);

        var result = await handler.Handle(new CreateApprovalWorkflowCommand
        {
            CompanyId = companyId,
            Name = "Autoridad mayor a 1M",
            MinAmount = 1_000_000,
            MaxAmount = 10_000_000,
            RequiredRole = UserRole.Autoridad,
            RequiredApprovals = 2
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(2, result.RequiredApprovals);

        var workflows = await new GetApprovalWorkflowsQueryHandler(context)
            .Handle(new GetApprovalWorkflowsQuery(companyId), CancellationToken.None);

        Assert.Single(workflows);
        Assert.Equal(UserRole.Autoridad, workflows[0].RequiredRole);
    }

    [Fact]
    public async Task UpsertCompanyConfiguration_ShouldCreateAndUpdateConfiguration()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var handler = new UpsertCompanyConfigurationCommandHandler(context);

        var created = await handler.Handle(new UpsertCompanyConfigurationCommand
        {
            CompanyId = companyId,
            DefaultCurrency = "ars",
            TimeZone = "America/Argentina/Buenos_Aires",
            MinimumBidDecrementPercentage = 1.5m,
            AuctionExtensionMinutes = 3,
            RequireSupplierVerification = true
        }, CancellationToken.None);

        var updated = await handler.Handle(new UpsertCompanyConfigurationCommand
        {
            CompanyId = companyId,
            DefaultCurrency = "USD",
            TimeZone = "UTC",
            MinimumBidDecrementPercentage = 2,
            AuctionExtensionMinutes = 5,
            RequireSupplierVerification = false
        }, CancellationToken.None);

        Assert.Equal(created.Id, updated.Id);
        Assert.Equal("USD", updated.DefaultCurrency);
        Assert.False(updated.RequireSupplierVerification);

        var loaded = await new GetCompanyConfigurationQueryHandler(context)
            .Handle(new GetCompanyConfigurationQuery(companyId), CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal(5, loaded.AuctionExtensionMinutes);
    }

    private static async Task<Guid> SeedCompany(ApplicationDbContext context)
    {
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = "Municipio Test",
            Domain = "municipio-test",
            IsPublicEntity = true
        };

        context.Companies.Add(company);
        await context.SaveChangesAsync();
        return company.Id;
    }
}
