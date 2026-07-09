using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SICST.Infrastructure.Arca;

public class TicketAccesoManager
{
    private static readonly TimeSpan MinValidity = TimeSpan.FromMinutes(10);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ArcaOptions _options;
    private readonly ILogger<TicketAccesoManager> _logger;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    private TicketAcceso? _currentTa;
    private string? _service;

    public TicketAccesoManager(
        IServiceScopeFactory scopeFactory,
        IOptions<ArcaOptions> options,
        ILogger<TicketAccesoManager> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    public void SetService(string service)
    {
        _service = service;
    }

    public async Task<TicketAcceso> GetTicketAccesoAsync(CancellationToken ct)
    {
        if (_currentTa is not null && !_currentTa.IsExpired && HasSufficientValidity())
            return _currentTa;

        await _semaphore.WaitAsync(ct);
        try
        {
            if (_currentTa is not null && !_currentTa.IsExpired && HasSufficientValidity())
                return _currentTa;

            using var scope = _scopeFactory.CreateScope();
            var wsaaClient = scope.ServiceProvider.GetRequiredService<WsaaClient>();

            var service = _service ?? _options.GetEffectivePadronService();
            var (token, sign) = await wsaaClient.LoginAsync(service, ct);

            _currentTa = new TicketAcceso
            {
                Token = token,
                Sign = sign,
                ExpirationUtc = DateTime.UtcNow.AddMinutes(_options.TaLifeTimeMinutes)
            };

            _logger.LogInformation(
                "New ARCA TA obtained for service {Service}, expires at {Expiration}",
                service, _currentTa.ExpirationUtc);

            return _currentTa;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private bool HasSufficientValidity()
    {
        return _currentTa is not null &&
               _currentTa.ExpirationUtc - DateTime.UtcNow > MinValidity;
    }

    internal void SetCurrentTaForTesting(TicketAcceso ta)
    {
        _currentTa = ta;
    }
}
