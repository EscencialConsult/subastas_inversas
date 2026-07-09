using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SICST.Api.Services;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Tests.Arca;

public class SupplierArcaVerificationServiceTests
{
    [Fact]
    public async Task RunCycle_ShouldVerifyPendingSupplier_WhenArcaPasses()
    {
        using var context = TestDbContextFactory.Create(new TestCurrentTenant());
        var supplierId = await SeedPendingSupplierAsync(context);
        var emailSender = new RecordingEmailSender();

        await using var provider = CreateProvider(
            context,
            new FixedArcaVerificationService(new ArcaVerificationResult(true, "Situación fiscal verificada: CUIT activo y datos coinciden con ARCA.")
            {
                TaxpayerData = CreateTaxpayerData()
            }),
            emailSender);

        var service = new SupplierArcaVerificationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<SupplierArcaVerificationService>.Instance);

        await service.StartAsync(CancellationToken.None);
        await emailSender.WaitForEmailAsync();
        await service.StopAsync(CancellationToken.None);

        var supplier = await context.Suppliers.Include(s => s.User).SingleAsync(s => s.Id == supplierId);
        Assert.Equal(SupplierStatus.Verified, supplier.Status);
        Assert.Equal(ArcaVerificationStatus.Verified, supplier.ArcaVerificationStatus);
        Assert.True(supplier.ArcaVerified);
        Assert.True(supplier.User.Active);
        Assert.Equal("hashed-temporary-password", supplier.User.PasswordHash);
        Assert.NotNull(supplier.ArcaVerifiedAtUtc);
        Assert.NotNull(supplier.CredentialsSentAtUtc);
        Assert.Equal("Proveedor Test SRL", supplier.ArcaBusinessName);
        Assert.Equal("RESPONSABLE INSCRIPTO", supplier.ArcaIvaCondition);
        Assert.Equal("San Miguel de Tucuman", supplier.ArcaFiscalCity);
        Assert.Single(emailSender.Messages);
        Assert.Contains("verificada", emailSender.Messages[0].Subject);
    }

    [Fact]
    public async Task RunCycle_ShouldRejectPendingSupplier_WhenArcaRejects()
    {
        using var context = TestDbContextFactory.Create(new TestCurrentTenant());
        var supplierId = await SeedPendingSupplierAsync(context);
        var emailSender = new RecordingEmailSender();

        await using var provider = CreateProvider(
            context,
            new FixedArcaVerificationService(new ArcaVerificationResult(false, "CUIT no encontrado en ARCA.")),
            emailSender);

        var service = new SupplierArcaVerificationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<SupplierArcaVerificationService>.Instance);

        await service.StartAsync(CancellationToken.None);
        await emailSender.WaitForEmailAsync();
        await service.StopAsync(CancellationToken.None);

        var supplier = await context.Suppliers.Include(s => s.User).SingleAsync(s => s.Id == supplierId);
        Assert.Equal(SupplierStatus.Rejected, supplier.Status);
        Assert.Equal(ArcaVerificationStatus.Rejected, supplier.ArcaVerificationStatus);
        Assert.False(supplier.ArcaVerified);
        Assert.False(supplier.User.Active);
        Assert.Equal("CUIT no encontrado en ARCA.", supplier.ArcaVerificationNotes);
        Assert.Single(emailSender.Messages);
        Assert.Contains("No pudimos verificar", emailSender.Messages[0].Subject);
    }

    [Fact]
    public async Task RunCycle_ShouldFallbackToPersonName_WhenArcaDoesNotReturnBusinessName()
    {
        using var context = TestDbContextFactory.Create(new TestCurrentTenant());
        var supplierId = await SeedPendingSupplierAsync(context);
        var emailSender = new RecordingEmailSender();

        await using var provider = CreateProvider(
            context,
            new FixedArcaVerificationService(new ArcaVerificationResult(true, "Datos fiscales verificados por ARCA.")
            {
                TaxpayerData = new ArcaTaxpayerData
                {
                    Cuit = 20123456789,
                    PersonType = "FISICA",
                    KeyStatus = "ACTIVO",
                    FirstName = "Juan",
                    LastName = "Perez",
                    IvaCondition = "MONOTRIBUTO",
                    FiscalAddress = new FiscalAddress
                    {
                        Street = "Belgrano",
                        StreetNumber = 456,
                        City = "Yerba Buena",
                        Province = "Tucuman",
                        Country = "Argentina"
                    }
                }
            }),
            emailSender);

        var service = new SupplierArcaVerificationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<SupplierArcaVerificationService>.Instance);

        await service.StartAsync(CancellationToken.None);
        await emailSender.WaitForEmailAsync();
        await service.StopAsync(CancellationToken.None);

        var supplier = await context.Suppliers.Include(s => s.User).SingleAsync(s => s.Id == supplierId);
        Assert.Equal("Perez, Juan", supplier.ArcaBusinessName);
        Assert.Equal("MONOTRIBUTO", supplier.ArcaIvaCondition);
        Assert.Equal("Belgrano 456", supplier.ArcaFiscalAddress);
    }

    private static ServiceProvider CreateProvider(
        ApplicationDbContext context,
        IArcaVerificationService arca,
        IEmailSender emailSender)
    {
        var services = new ServiceCollection();
        services.AddSingleton(context);
        services.AddSingleton(arca);
        services.AddSingleton<IPasswordHasher, FixedPasswordHasher>();
        services.AddSingleton(emailSender);
        services.AddSingleton<IArcaVerificationAuditStore>(sp =>
            new ArcaVerificationAuditStore(sp.GetRequiredService<ApplicationDbContext>()));
        return services.BuildServiceProvider();
    }

    private static async Task<Guid> SeedPendingSupplierAsync(ApplicationDbContext context)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"proveedor-{Guid.NewGuid():N}@test.com",
            PasswordHash = "pending",
            FirstName = "Proveedor",
            LastName = "Test",
            Role = UserRole.Proveedor,
            Active = false
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            User = user,
            BusinessName = "Proveedor Test SRL",
            Cuit = "30-12345678-1",
            Email = user.Email,
            BusinessCategory = "Servicios",
            Province = "Tucuman",
            Locality = "San Miguel de Tucuman",
            Status = SupplierStatus.Pending,
            ArcaVerificationStatus = ArcaVerificationStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Users.Add(user);
        context.Suppliers.Add(supplier);
        await context.SaveChangesAsync();
        return supplier.Id;
    }

    private static ArcaTaxpayerData CreateTaxpayerData()
    {
        return new ArcaTaxpayerData
        {
            Cuit = 30123456781,
            BusinessName = "Proveedor Test SRL",
            PersonType = "JURIDICA",
            KeyStatus = "ACTIVO",
            IvaCondition = "RESPONSABLE INSCRIPTO",
            IvaConditionId = 30,
            EmployeeCount = 4,
            FiscalAddress = new FiscalAddress
            {
                Street = "San Martin",
                StreetNumber = 123,
                City = "San Miguel de Tucuman",
                Province = "Tucuman",
                Country = "Argentina"
            }
        };
    }

    private sealed class FixedArcaVerificationService : IArcaVerificationService
    {
        private readonly ArcaVerificationResult _result;

        public FixedArcaVerificationService(ArcaVerificationResult result)
        {
            _result = result;
        }

        public Task<ArcaVerificationResult> VerifySupplierAsync(
            ArcaVerificationRequest request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(_result);
        }
    }

    private sealed class FixedPasswordHasher : IPasswordHasher
    {
        public string Hash(string password) => "hashed-temporary-password";

        public bool Verify(string password, string hashedPassword) => hashedPassword == "hashed-temporary-password";
    }

    private sealed class RecordingEmailSender : IEmailSender
    {
        private readonly TaskCompletionSource _sent = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public List<EmailMessage> Messages { get; } = [];

        public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
        {
            Messages.Add(new EmailMessage(to, subject, body));
            _sent.TrySetResult();
            return Task.CompletedTask;
        }

        public async Task WaitForEmailAsync()
        {
            var completed = await Task.WhenAny(_sent.Task, Task.Delay(TimeSpan.FromSeconds(5)));
            Assert.Same(_sent.Task, completed);
        }
    }

    private sealed record EmailMessage(string To, string Subject, string Body);
}
