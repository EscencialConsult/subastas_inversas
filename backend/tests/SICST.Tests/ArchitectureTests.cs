using NetArchTest.Rules;
using SICST.Application;

namespace SICST.Tests;

public class ArchitectureTests
{
    private static readonly System.Reflection.Assembly ApplicationAssembly = typeof(DependencyInjection).Assembly;

    [Fact]
    public void AuctionsModule_ShouldNotDependOn_PurchasesModule()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That()
            .ResideInNamespace("SICST.Application.Modules.Auctions")
            .ShouldNot()
            .HaveDependencyOn("SICST.Application.Modules.Purchases")
            .GetResult();

        Assert.True(result.IsSuccessful, "Auctions module should not depend on Purchases module directly.");
    }

    [Fact]
    public void IdentityModule_ShouldNotDependOn_AuctionsModule()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That()
            .ResideInNamespace("SICST.Application.Modules.Identity")
            .ShouldNot()
            .HaveDependencyOn("SICST.Application.Modules.Auctions")
            .GetResult();

        Assert.True(result.IsSuccessful, "Identity module should not depend on Auctions module.");
    }

    [Fact]
    public void AuditModule_ShouldNotDependOn_AuctionsModule()
    {
        var result = Types.InAssembly(ApplicationAssembly)
            .That()
            .ResideInNamespace("SICST.Application.Modules.Audit")
            .ShouldNot()
            .HaveDependencyOn("SICST.Application.Modules.Auctions")
            .GetResult();

        Assert.True(result.IsSuccessful, "Audit module should not depend on Auctions module.");
    }
}
