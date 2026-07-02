using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Configuration;
using SICST.Application.Modules.Configuration.Commands;
using SICST.Application.Modules.Configuration.Queries;
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

        var context = new ApplicationDbContext(options, new SICST.Tests.TestCurrentTenant());
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
            MinAmount = 0,
            MaxAmount = 1_000_000,
            RequiresAuction = true
        }, CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.True(result.RequiresAuction);
        Assert.Equal(1_000_000, result.MaxAmount);

        var modes = await new GetContractingModesQueryHandler(context)
            .Handle(new GetContractingModesQuery(companyId), CancellationToken.None);

        Assert.Single(modes);
        Assert.Equal("Subasta inversa", modes[0].Name);
    }

    [Fact]
    public async Task CreateContractingMode_ShouldRejectOverlappingActiveRanges()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var handler = new CreateContractingModeCommandHandler(context);

        await handler.Handle(new CreateContractingModeCommand
        {
            CompanyId = companyId,
            Name = "Compra directa",
            MinAmount = 0,
            MaxAmount = 100_000
        }, CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new CreateContractingModeCommand
            {
                CompanyId = companyId,
                Name = "Concurso",
                MinAmount = 50_000,
                MaxAmount = 200_000
            }, CancellationToken.None));
    }

    [Fact]
    public async Task SuggestContractingMode_ShouldReturnModeForAmount()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var createHandler = new CreateContractingModeCommandHandler(context);

        await createHandler.Handle(new CreateContractingModeCommand
        {
            CompanyId = companyId,
            Name = "Compra directa",
            MinAmount = 0,
            MaxAmount = 100_000,
            RequiresAuction = false
        }, CancellationToken.None);

        await createHandler.Handle(new CreateContractingModeCommand
        {
            CompanyId = companyId,
            Name = "Subasta inversa",
            MinAmount = 100_000.01m,
            MaxAmount = null,
            RequiresAuction = true
        }, CancellationToken.None);

        var suggestion = await new SuggestContractingModeQueryHandler(context)
            .Handle(new SuggestContractingModeQuery(companyId, 250_000), CancellationToken.None);

        Assert.NotNull(suggestion);
        Assert.Equal("Subasta inversa", suggestion.Name);
        Assert.True(suggestion.RequiresAuction);
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
        Assert.Equal(2, result.Levels.Count);

        var workflows = await new GetApprovalWorkflowsQueryHandler(context)
            .Handle(new GetApprovalWorkflowsQuery(companyId), CancellationToken.None);

        Assert.Single(workflows);
        Assert.Equal(UserRole.Autoridad, workflows[0].RequiredRole);
        Assert.Equal([1, 2], workflows[0].Levels.Select(l => l.LevelOrder).ToArray());
    }

    [Fact]
    public async Task CreateApprovalWorkflow_ShouldPersistOrderedLevels()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);

        var result = await new CreateApprovalWorkflowCommandHandler(context)
            .Handle(new CreateApprovalWorkflowCommand
            {
                CompanyId = companyId,
                Name = "Circuito escalonado",
                MinAmount = 0,
                MaxAmount = 5_000_000,
                Levels =
                [
                    new ApprovalWorkflowLevelInputDto
                    {
                        LevelOrder = 2,
                        RequiredRole = UserRole.Autoridad,
                        AmountThreshold = 1_000_000
                    },
                    new ApprovalWorkflowLevelInputDto
                    {
                        LevelOrder = 1,
                        RequiredRole = UserRole.Admin,
                        AmountThreshold = 0
                    }
                ]
            }, CancellationToken.None);

        Assert.Equal(2, result.Levels.Count);
        Assert.Equal(UserRole.Admin, result.Levels[0].RequiredRole);
        Assert.Equal(UserRole.Autoridad, result.Levels[1].RequiredRole);
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

    [Fact]
    public async Task DocumentTemplates_ShouldCreateVersionsAndActivateOnlyOne()
    {
        using var context = CreateDbContext();
        var companyId = await SeedCompany(context);
        var createHandler = new CreateDocumentTemplateVersionCommandHandler(context);

        var first = await createHandler.Handle(new CreateDocumentTemplateVersionCommand
        {
            CompanyId = companyId,
            Type = DocumentTemplateType.Contract,
            Name = "Contrato base",
            Content = "Contrato v1",
            Activate = true
        }, CancellationToken.None);

        var second = await createHandler.Handle(new CreateDocumentTemplateVersionCommand
        {
            CompanyId = companyId,
            Type = DocumentTemplateType.Contract,
            Name = "Contrato actualizado",
            Content = "Contrato v2",
            Activate = true
        }, CancellationToken.None);

        Assert.Equal(1, first.Version);
        Assert.Equal(2, second.Version);
        Assert.True(second.Active);

        var templates = await new GetDocumentTemplatesQueryHandler(context)
            .Handle(new GetDocumentTemplatesQuery(companyId, DocumentTemplateType.Contract), CancellationToken.None);

        Assert.Equal(2, templates.Count);
        Assert.Single(templates, t => t.Active);
        Assert.Equal(second.Id, templates.Single(t => t.Active).Id);

        var reactivated = await new ActivateDocumentTemplateCommandHandler(context)
            .Handle(new ActivateDocumentTemplateCommand(companyId, first.Id), CancellationToken.None);

        Assert.True(reactivated.Active);
        Assert.Single(context.DocumentTemplates, t => t.CompanyId == companyId && t.Type == DocumentTemplateType.Contract && t.Active);
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
