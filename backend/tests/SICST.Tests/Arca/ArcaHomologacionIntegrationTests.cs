using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SICST.Application.Common.Models;
using SICST.Infrastructure.Arca;

namespace SICST.Tests.Arca;

public sealed class ArcaHomologacionIntegrationTests : IDisposable
{
    private const string Cuit = "27302210794";
    private const string Service = "ws_sr_padron_a5";
    private const long TestCuit = 27302210794;

    private readonly HttpClient _httpClient;
    private readonly ArcaOptions _options;
    private readonly CmsGenerator _cmsGenerator;
    private readonly WsaaClient _wsaaClient;

    public ArcaHomologacionIntegrationTests()
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "SICST-Tests/1.0");

        var certPath = ResolveCertPath();

        _options = new ArcaOptions
        {
            CertificatePath = certPath,
            CertificatePassword = "SICST2026",
            Cuit = Cuit,
            Environment = "homologacion",
            WsaaUrlHomologacion = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
            PadronA5UrlHomologacion = "https://awshomo.afip.gov.ar/sr-padron/webservices/personaServiceA5",
            TaLifeTimeMinutes = 660
        };

        _cmsGenerator = new CmsGenerator(Options.Create(_options));
        _wsaaClient = new WsaaClient(
            _httpClient,
            _cmsGenerator,
            Options.Create(_options),
            new ConsoleLogger<WsaaClient>());
    }

    [RequiresArcaHomologacionFact]
    public async Task Obtener_TA_y_Consultar_PadronA5()
    {
        // Act - Obtener Ticket de Acceso
        var (token, sign) = await _wsaaClient.LoginAsync(Service, CancellationToken.None);

        // Assert TA
        Assert.False(string.IsNullOrWhiteSpace(token), "El token del TA no debería estar vacío");
        Assert.False(string.IsNullOrWhiteSpace(sign), "La sign del TA no debería estar vacía");

        // Arrange - Crear PadronA5Client con el TA obtenido
            var padronClient = CreatePadronA5Client(token, sign);

            // Act - Consultar CUIT del certificado
        var taxpayer = await padronClient.GetPersonaAsync(TestCuit, CancellationToken.None);

        // Assert - Datos del contribuyente
        Assert.NotNull(taxpayer);
        Assert.True(taxpayer.Found, $"El CUIT {TestCuit} debería encontrarse en el padrón. Error: {taxpayer.MensajeError}");
        Assert.Equal("ACTIVO", taxpayer.KeyStatus);
        Assert.Equal(TestCuit, taxpayer.Cuit);
        Assert.False(string.IsNullOrWhiteSpace(taxpayer.BusinessName) &&
                     string.IsNullOrWhiteSpace(taxpayer.LastName),
                     "Debería tener razón social o apellido y nombre");

        // Assert - Domicilio fiscal
        Assert.NotNull(taxpayer.FiscalAddress);
        Assert.False(string.IsNullOrWhiteSpace(taxpayer.FiscalAddress.Province));

        // Assert - Condición IVA
        Assert.False(string.IsNullOrWhiteSpace(taxpayer.IvaCondition),
                     "Debería tener condición IVA");

        // Assert - Actividades económicas
        Assert.NotEmpty(taxpayer.EconomicActivities);

        Console.WriteLine($"=== RESULTADO ===");
        Console.WriteLine($"CUIT: {taxpayer.Cuit}");
        Console.WriteLine($"Tipo: {taxpayer.PersonType}");
        Console.WriteLine($"Estado: {taxpayer.KeyStatus}");
        Console.WriteLine($"Razón Social: {taxpayer.BusinessName}");
        Console.WriteLine($"Condición IVA: {taxpayer.IvaCondition}");
        Console.WriteLine($"Domicilio: {taxpayer.FiscalAddress?.Street} {taxpayer.FiscalAddress?.StreetNumber}, {taxpayer.FiscalAddress?.City}, {taxpayer.FiscalAddress?.Province}");
        Console.WriteLine($"Actividades: {taxpayer.EconomicActivities.Count}");
        Console.WriteLine($"Monotributo: {taxpayer.MonotributoCategory ?? "N/A"}");
        Console.WriteLine($"Empleados: {taxpayer.EmployeeCount?.ToString() ?? "N/A"}");
    }

    [RequiresArcaHomologacionFact]
    public async Task Consultar_CUIT_Inexistente_Devuelve_NoEncontrado()
    {
        const long cuitInexistente = 20000000000;

        var (token, sign) = await _wsaaClient.LoginAsync(Service, CancellationToken.None);
            var padronClient = CreatePadronA5Client(token, sign);

        var taxpayer = await padronClient.GetPersonaAsync(cuitInexistente, CancellationToken.None);

        Assert.NotNull(taxpayer);
        Assert.False(taxpayer.Found);
        Assert.False(string.IsNullOrWhiteSpace(taxpayer.MensajeError));
    }

    private PadronA5Client CreatePadronA5Client(string token, string sign)
    {
        var ta = new TicketAcceso
        {
            Token = token,
            Sign = sign,
            ExpirationUtc = DateTime.UtcNow.AddHours(11)
        };

        var taManager = new TicketAccesoManager(
            CreateScopeFactory(ta),
            Options.Create(_options),
            new ConsoleLogger<TicketAccesoManager>());

        var padronHttpClient = new HttpClient();
        padronHttpClient.DefaultRequestHeaders.Add("User-Agent", "SICST-Tests/1.0");

        return new PadronA5Client(
            padronHttpClient,
            taManager,
            Options.Create(_options),
            new ConsoleLogger<PadronA5Client>());
    }

    private static IServiceScopeFactory CreateScopeFactory(TicketAcceso ta)
    {
        var services = new ServiceCollection();
        services.AddSingleton(ta);
        services.AddSingleton<WsaaClient>(_ => null!);
        return services.BuildServiceProvider().GetRequiredService<IServiceScopeFactory>();
    }

    private static string ResolveCertPath()
    {
        var dir = AppContext.BaseDirectory;
        while (dir is not null && !Directory.Exists(Path.Combine(dir, ".git")))
        {
            dir = Path.GetDirectoryName(dir);
        }

        if (dir is null)
            throw new InvalidOperationException("No se encontró la raíz del repositorio");

        return Path.GetFullPath(Path.Combine(dir, "certificados_arca", "subastas_inversas.p12"));
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}

internal sealed class ConsoleLogger<T> : ILogger<T>
{
    private readonly string _category = typeof(T).Name;

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        var message = formatter(state, exception);
        Console.WriteLine($"[{_category}] {message}");
    }
}
