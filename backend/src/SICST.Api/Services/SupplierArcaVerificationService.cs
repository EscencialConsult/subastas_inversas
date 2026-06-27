using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Api.Services;

public class SupplierArcaVerificationService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SupplierArcaVerificationService> _logger;

    public SupplierArcaVerificationService(
        IServiceScopeFactory scopeFactory,
        ILogger<SupplierArcaVerificationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnce(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while running supplier ARCA verification.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    internal async Task RunOnce(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var arca = scope.ServiceProvider.GetRequiredService<IArcaVerificationService>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var suppliers = await context.Suppliers
            .Include(s => s.User)
            .Where(s => s.ArcaVerificationStatus == ArcaVerificationStatus.Pending)
            .OrderBy(s => s.CreatedAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var supplier in suppliers)
        {
            var result = await arca.VerifySupplierAsync(new ArcaVerificationRequest(
                supplier.Cuit,
                supplier.BusinessName,
                supplier.Email,
                supplier.Province,
                supplier.Locality), cancellationToken);

            supplier.ArcaVerificationNotes = result.Notes;

            if (result.Verified)
            {
                var temporaryPassword = GenerateTemporaryPassword();
                supplier.Status = SupplierStatus.Verified;
                supplier.ArcaVerified = true;
                supplier.ArcaVerificationStatus = ArcaVerificationStatus.Verified;
                supplier.ArcaVerifiedAtUtc = DateTime.UtcNow;
                supplier.CredentialsSentAtUtc = DateTime.UtcNow;
                supplier.User.Active = true;
                supplier.User.PasswordHash = passwordHasher.Hash(temporaryPassword);

                await emailSender.SendAsync(
                    supplier.Email,
                    "Tu cuenta de proveedor fue verificada",
                    BuildVerifiedEmail(supplier, temporaryPassword),
                    cancellationToken);
            }
            else
            {
                supplier.Status = SupplierStatus.Rejected;
                supplier.ArcaVerified = false;
                supplier.ArcaVerificationStatus = ArcaVerificationStatus.Rejected;
                supplier.User.Active = false;

                await emailSender.SendAsync(
                    supplier.Email,
                    "No pudimos verificar tus datos de proveedor",
                    BuildRejectedEmail(supplier),
                    cancellationToken);
            }
        }

        if (suppliers.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    private static string GenerateTemporaryPassword()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
        Span<byte> bytes = stackalloc byte[14];
        RandomNumberGenerator.Fill(bytes);

        var chars = new char[14];
        for (var i = 0; i < bytes.Length; i++)
        {
            chars[i] = alphabet[bytes[i] % alphabet.Length];
        }

        return new string(chars);
    }

    private static string BuildVerifiedEmail(Supplier supplier, string temporaryPassword)
    {
        return $"""
            Hola {supplier.BusinessName},

            ARCA verificó correctamente tus datos de proveedor.

            Usuario: {supplier.Email}
            Contraseña temporal: {temporaryPassword}

            Ingresá al sistema y cambiá la contraseña cuando puedas.
            """;
    }

    private static string BuildRejectedEmail(Supplier supplier)
    {
        return $"""
            Hola {supplier.BusinessName},

            No pudimos verificar tus datos con ARCA.

            Motivo: {supplier.ArcaVerificationNotes}

            Revisá la información cargada y volvé a solicitar el alta.
            """;
    }
}
