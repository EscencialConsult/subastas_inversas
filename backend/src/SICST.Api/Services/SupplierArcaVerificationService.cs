using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Common.Models;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Api.Services;

public class SupplierArcaVerificationService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan ArcaValidityPeriod = TimeSpan.FromDays(180);

    // Tope de reintentos de ENTREGA de credenciales: si tras 7 días no se pudo mandar el
    // correo, se deja de reintentar y se marca para revisión (por si el email es inválido).
    private static readonly TimeSpan CredentialDeliveryMaxAge = TimeSpan.FromDays(7);

    // Se agrega a las notas del proveedor cuando se agota el tope de 7 días. Sirve de marca
    // para no volver a reintentar ni a re-leer ese proveedor en cada ciclo.
    private const string CredentialDeliveryFailedMarker =
        "No se pudieron entregar las credenciales automaticamente tras varios dias de intentos. Revisar el correo del proveedor o reenviarlas manualmente.";

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
                await RunRenewalsOnce(stoppingToken);
                await RunCredentialDeliveryOnce(stoppingToken);
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
        var audit = scope.ServiceProvider.GetRequiredService<IArcaVerificationAuditStore>();

        var pending = await context.Suppliers
            .Include(s => s.User)
            .Where(s => s.ArcaVerificationStatus == ArcaVerificationStatus.Pending)
            .OrderBy(s => s.CreatedAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var supplier in pending)
        {
            await ProcessSupplierAsync(supplier, arca, passwordHasher, emailSender, audit, context, cancellationToken);
        }

        if (pending.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    internal async Task RunRenewalsOnce(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var arca = scope.ServiceProvider.GetRequiredService<IArcaVerificationService>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
        var audit = scope.ServiceProvider.GetRequiredService<IArcaVerificationAuditStore>();

        var now = DateTime.UtcNow;
        var nearExpiry = now.AddDays(30);

        var expiring = await context.Suppliers
            .Include(s => s.User)
            .Where(s => s.ArcaVerificationStatus == ArcaVerificationStatus.Verified
                && s.ArcaVerificationExpiresAtUtc != null
                && s.ArcaVerificationExpiresAtUtc <= nearExpiry
                && (s.ArcaLastRenewalAttemptAtUtc == null || s.ArcaLastRenewalAttemptAtUtc < now.AddHours(-1)))
            .OrderBy(s => s.ArcaVerificationExpiresAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var supplier in expiring)
        {
            supplier.ArcaLastRenewalAttemptAtUtc = now;

            var result = await arca.VerifySupplierAsync(new ArcaVerificationRequest(
                supplier.Cuit,
                supplier.BusinessName,
                supplier.Email,
                supplier.Province,
                supplier.Locality), cancellationToken);

            supplier.ArcaBusinessNameMatchScore = result.BusinessNameMatchScore;

            await audit.RecordAsync(
                supplier.Id,
                result.Verified ? ArcaVerificationStatus.Verified : ArcaVerificationStatus.Pending,
                result.Notes,
                "ARCA-Renovacion",
                result.BusinessNameMatchScore,
                automatic: true,
                cuitConsulted: supplier.Cuit,
                businessNameDeclared: supplier.BusinessName,
                businessNameFoundInArca: result.TaxpayerData?.BusinessName,
                cancellationToken: cancellationToken);

            if (result.Verified && !result.RequiresManualReview)
            {
                supplier.ArcaVerificationExpiresAtUtc = now.Add(ArcaValidityPeriod);
                EnrichWithArcaData(supplier, result.TaxpayerData);

                await TrySendEmailAsync(
                    emailSender,
                    supplier.Email,
                    "Tu verificacion ARCA fue renovada",
                    BuildRenewedEmail(supplier),
                    cancellationToken);
            }
            else if (!result.Verified)
            {
                supplier.ArcaVerificationStatus = ArcaVerificationStatus.Pending;

                await TrySendEmailAsync(
                    emailSender,
                    supplier.Email,
                    "Tu verificacion ARCA necesita atencion",
                    BuildRenewalFailedEmail(supplier, result.Notes),
                    cancellationToken);
            }
        }

        if (expiring.Count > 0)
        {
            await context.SaveChangesAsync(cancellationToken);
        }
    }

    // Reintenta la ENTREGA del correo de credenciales a proveedores ya verificados por ARCA
    // cuyo email de bienvenida todavía no salió (CredentialsSentAtUtc == null). Corre en cada
    // ciclo, así un fallo transitorio del correo se recupera solo, sin intervención humana.
    // Tras CredentialDeliveryMaxAge (7 días) sin lograrlo, deja de reintentar y lo marca.
    internal async Task RunCredentialDeliveryOnce(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();

        var now = DateTime.UtcNow;
        var giveUpBefore = now.Subtract(CredentialDeliveryMaxAge);

        var pendingDelivery = await context.Suppliers
            .Include(s => s.User)
            .Where(s => s.ArcaVerificationStatus == ArcaVerificationStatus.Verified
                && s.CredentialsSentAtUtc == null
                && s.User != null
                // Excluye los que ya superaron el tope Y ya fueron marcados, para no
                // volver a leerlos en cada ciclo (los que aún no se marcaron sí entran).
                && (s.ArcaVerifiedAtUtc == null
                    || s.ArcaVerifiedAtUtc >= giveUpBefore
                    || s.ArcaVerificationNotes == null
                    || !s.ArcaVerificationNotes.Contains(CredentialDeliveryFailedMarker)))
            .OrderBy(s => s.ArcaVerifiedAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

        if (pendingDelivery.Count == 0)
        {
            return;
        }

        foreach (var supplier in pendingDelivery)
        {
            // Pasó el tope de 7 días sin poder entregar: se deja de reintentar y se marca
            // (una sola vez) para que aparezca en el panel como caso a revisar.
            if (supplier.ArcaVerifiedAtUtc is not null && supplier.ArcaVerifiedAtUtc < giveUpBefore)
            {
                if (supplier.ArcaVerificationNotes is null
                    || !supplier.ArcaVerificationNotes.Contains(CredentialDeliveryFailedMarker))
                {
                    supplier.ArcaVerificationNotes = string.IsNullOrWhiteSpace(supplier.ArcaVerificationNotes)
                        ? CredentialDeliveryFailedMarker
                        : supplier.ArcaVerificationNotes + " | " + CredentialDeliveryFailedMarker;

                    _logger.LogError(
                        "No se pudieron entregar las credenciales al proveedor {Email} tras {Days} días. Se deja de reintentar.",
                        supplier.Email, CredentialDeliveryMaxAge.TotalDays);
                }

                continue;
            }

            // Regeneramos la contraseña en cada intento porque el hash guardado no es
            // reversible: no podríamos reenviar la anterior en texto plano. Como el proveedor
            // todavía no recibió ninguna, cambiarla no rompe nada.
            var temporaryPassword = GenerateTemporaryPassword();
            supplier.User!.PasswordHash = passwordHasher.Hash(temporaryPassword);

            var sent = await TrySendEmailAsync(
                emailSender,
                supplier.Email,
                "Tu cuenta de proveedor fue verificada",
                BuildVerifiedEmail(supplier, temporaryPassword),
                cancellationToken);

            if (sent)
            {
                supplier.CredentialsSentAtUtc = DateTime.UtcNow;
                _logger.LogInformation(
                    "Credenciales entregadas al proveedor {Email} tras reintento.", supplier.Email);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    // Envía un correo aislando cualquier fallo: registra el error y devuelve false en vez de
    // propagar la excepción, para que un problema de email nunca tumbe la lógica del negocio
    // (verificación, guardado). La cancelación por apagado sí se deja propagar.
    private async Task<bool> TrySendEmailAsync(
        IEmailSender emailSender,
        string to,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        try
        {
            await emailSender.SendAsync(to, subject, body, cancellationToken);
            return true;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Falló el envío de email a {To} (asunto: {Subject}). Se reintentará automáticamente.",
                to, subject);
            return false;
        }
    }

    private async Task ProcessSupplierAsync(
        Supplier supplier,
        IArcaVerificationService arca,
        IPasswordHasher passwordHasher,
        IEmailSender emailSender,
        IArcaVerificationAuditStore audit,
        ApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        var request = new ArcaVerificationRequest(
            supplier.Cuit, supplier.BusinessName,
            supplier.Email, supplier.Province, supplier.Locality);

        var result = await arca.VerifySupplierAsync(request, cancellationToken);

        supplier.ArcaBusinessNameMatchScore = result.BusinessNameMatchScore;

        await audit.RecordAsync(
            supplier.Id,
            result.Verified ? ArcaVerificationStatus.Verified : ArcaVerificationStatus.Rejected,
            result.Notes,
            "ARCA",
            result.BusinessNameMatchScore,
            automatic: true,
            cuitConsulted: supplier.Cuit,
            businessNameDeclared: supplier.BusinessName,
            businessNameFoundInArca: result.TaxpayerData?.BusinessName,
            rawResponseSummary: result.TaxpayerData?.Found == true
                ? JsonSerializer.Serialize(new
                {
                    result.TaxpayerData.PersonType,
                    result.TaxpayerData.KeyStatus,
                    result.TaxpayerData.IvaCondition,
                    result.TaxpayerData.MonotributoCategory
                })
                : null,
            cancellationToken: cancellationToken);

        supplier.ArcaVerificationNotes = result.Notes;

        if (result.RequiresManualReview)
        {
            supplier.Status = SupplierStatus.Pending;
            supplier.ArcaVerified = false;
            supplier.ArcaVerificationStatus = ArcaVerificationStatus.PendingManualReview;
            supplier.User.Active = false;

            await TrySendEmailAsync(
                emailSender,
                supplier.Email,
                "Tu registro esta pendiente de revision manual",
                BuildManualReviewEmail(supplier),
                cancellationToken);
        }
        else if (result.Verified)
        {
            EnrichWithArcaData(supplier, result.TaxpayerData);

            var temporaryPassword = GenerateTemporaryPassword();
            supplier.Status = SupplierStatus.Verified;
            supplier.ArcaVerified = true;
            supplier.ArcaVerificationStatus = ArcaVerificationStatus.Verified;
            supplier.ArcaVerifiedAtUtc = DateTime.UtcNow;
            supplier.ArcaVerificationExpiresAtUtc = DateTime.UtcNow.Add(ArcaValidityPeriod);
            supplier.User.Active = true;
            supplier.User.PasswordHash = passwordHasher.Hash(temporaryPassword);

            // La verificación ya quedó lista arriba y se guarda igual. El correo se intenta
            // acá, pero si falla NO se pierde nada: CredentialsSentAtUtc queda en null y el
            // envío se reintenta solo en RunCredentialDeliveryOnce hasta lograrlo.
            var credentialsSent = await TrySendEmailAsync(
                emailSender,
                supplier.Email,
                "Tu cuenta de proveedor fue verificada",
                BuildVerifiedEmail(supplier, temporaryPassword),
                cancellationToken);

            if (credentialsSent)
            {
                supplier.CredentialsSentAtUtc = DateTime.UtcNow;
            }
        }
        else
        {
            supplier.Status = SupplierStatus.Rejected;
            supplier.ArcaVerified = false;
            supplier.ArcaVerificationStatus = ArcaVerificationStatus.Rejected;
            supplier.User.Active = false;

            await TrySendEmailAsync(
                emailSender,
                supplier.Email,
                "No pudimos verificar tus datos de proveedor",
                BuildRejectedEmail(supplier),
                cancellationToken);
        }
    }

    private static void EnrichWithArcaData(Supplier supplier, ArcaTaxpayerData? data)
    {
        if (data is null) return;

        var displayName = ResolveArcaDisplayName(data);

        supplier.ArcaBusinessName = string.IsNullOrWhiteSpace(displayName) ? null : displayName;
        supplier.ArcaPersonType = string.IsNullOrWhiteSpace(data.PersonType) ? null : data.PersonType;
        supplier.ArcaIvaCondition = string.IsNullOrWhiteSpace(data.IvaCondition) ? null : data.IvaCondition;
        supplier.ArcaIvaConditionId = data.IvaConditionId;
        supplier.ArcaMonotributoCategory = data.MonotributoCategory;
        supplier.ArcaEmployeeCount = data.EmployeeCount;

        if (data.FiscalAddress is not null)
        {
            var addr = data.FiscalAddress;
            var parts = new[] { addr.Street, addr.StreetNumber?.ToString(), addr.Floor, addr.Apartment };
            supplier.ArcaFiscalAddress = string.Join(" ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
            supplier.ArcaFiscalCity = string.IsNullOrWhiteSpace(addr.City) ? null : addr.City;
            supplier.ArcaFiscalProvince = string.IsNullOrWhiteSpace(addr.Province) ? null : addr.Province;
        }

        supplier.ArcaRawData = JsonSerializer.Serialize(data, new JsonSerializerOptions
        {
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        });
    }

    private static string ResolveArcaDisplayName(ArcaTaxpayerData data)
    {
        if (!string.IsNullOrWhiteSpace(data.BusinessName)) return data.BusinessName.Trim();
        if (!string.IsNullOrWhiteSpace(data.LastName) && !string.IsNullOrWhiteSpace(data.FirstName))
            return $"{data.LastName.Trim()}, {data.FirstName.Trim()}";
        if (!string.IsNullOrWhiteSpace(data.LastName)) return data.LastName.Trim();
        return data.FirstName.Trim();
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
            Tu verificación vence el {supplier.ArcaVerificationExpiresAtUtc:dd/MM/yyyy}.
            """;
    }

    private static string BuildManualReviewEmail(Supplier supplier)
    {
        return $"""
            Hola {supplier.BusinessName},

            Registramos tus datos correctamente. La razón social declarada no coincide exactamente con la registrada en ARCA, por lo que tu solicitud pasó a revisión manual.

            Te vamos a notificar cuando un evaluador la revise.
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

    private static string BuildRenewedEmail(Supplier supplier)
    {
        return $"""
            Hola {supplier.BusinessName},

            Tu verificación ARCA fue renovada automáticamente y sigue vigente.

            Próximo vencimiento: {supplier.ArcaVerificationExpiresAtUtc:dd/MM/yyyy}
            """;
    }

    private static string BuildRenewalFailedEmail(Supplier supplier, string notes)
    {
        return $"""
            Hola {supplier.BusinessName},

            No pudimos renovar automáticamente tu verificación ARCA.

            Motivo: {notes}

            Ingresá al sistema para revisar tu situación fiscal.
            """;
    }
}
