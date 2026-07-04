using Microsoft.EntityFrameworkCore;
using System.Diagnostics.Metrics;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Api.Services;

public sealed class OutboxDispatcherService : BackgroundService
{
    private static readonly Meter Meter = new("SICST.Api.Outbox");
    private static readonly Counter<long> ClaimedCounter = Meter.CreateCounter<long>("sicst.outbox.claimed");
    private static readonly Counter<long> ProcessedCounter = Meter.CreateCounter<long>("sicst.outbox.processed");
    private static readonly Counter<long> FailedCounter = Meter.CreateCounter<long>("sicst.outbox.failed");
    private static readonly Histogram<double> DispatchDuration = Meter.CreateHistogram<double>("sicst.outbox.dispatch.duration.ms");
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan LockDuration = TimeSpan.FromMinutes(2);
    private const int BatchSize = 25;
    private const int MaxAttempts = 5;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OutboxDispatcherService> _logger;

    public OutboxDispatcherService(
        IServiceScopeFactory scopeFactory,
        ILogger<OutboxDispatcherService> logger)
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
                _logger.LogError(ex, "Outbox dispatcher failed.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    public async Task RunOnce(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var now = DateTime.UtcNow;
        var lockId = Guid.NewGuid().ToString("N");

        var messages = await context.OutboxMessages
            .Where(message =>
                (message.Status == OutboxMessageStatus.Pending || message.Status == OutboxMessageStatus.Failed)
                && (message.AvailableAtUtc == null || message.AvailableAtUtc <= now)
                && (message.LockedUntilUtc == null || message.LockedUntilUtc <= now)
                && message.Attempts < MaxAttempts)
            .OrderBy(message => message.CreatedAtUtc)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        foreach (var message in messages)
        {
            message.Status = OutboxMessageStatus.Processing;
            message.LockId = lockId;
            message.LockedUntilUtc = now.Add(LockDuration);
        }

        if (messages.Count == 0)
        {
            return;
        }

        await context.SaveChangesAsync(cancellationToken);
        ClaimedCounter.Add(messages.Count);

        foreach (var message in messages)
        {
            var startedAt = DateTime.UtcNow;
            try
            {
                await DispatchAsync(message, cancellationToken);
                message.Status = OutboxMessageStatus.Processed;
                message.ProcessedAtUtc = DateTime.UtcNow;
                message.LockId = null;
                message.LockedUntilUtc = null;
                message.LastError = null;
                ProcessedCounter.Add(1, new KeyValuePair<string, object?>("event_type", message.EventType));
                DispatchDuration.Record((DateTime.UtcNow - startedAt).TotalMilliseconds, new KeyValuePair<string, object?>("event_type", message.EventType));
            }
            catch (Exception ex)
            {
                message.Attempts++;
                message.Status = message.Attempts >= MaxAttempts
                    ? OutboxMessageStatus.Failed
                    : OutboxMessageStatus.Pending;
                message.AvailableAtUtc = DateTime.UtcNow.Add(GetBackoff(message.Attempts));
                message.LockId = null;
                message.LockedUntilUtc = null;
                message.LastError = ex.Message;
                FailedCounter.Add(1, new KeyValuePair<string, object?>("event_type", message.EventType));

                _logger.LogError(
                    ex,
                    "Outbox event {EventType} with idempotency key {IdempotencyKey} failed on attempt {Attempt}",
                    message.EventType,
                    message.IdempotencyKey,
                    message.Attempts);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private Task DispatchAsync(OutboxMessage message, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Dispatching outbox event {EventType} with idempotency key {IdempotencyKey}",
            message.EventType,
            message.IdempotencyKey);

        return Task.CompletedTask;
    }

    private static TimeSpan GetBackoff(int attempts)
    {
        var seconds = Math.Min(300, Math.Pow(2, Math.Max(1, attempts)));
        return TimeSpan.FromSeconds(seconds);
    }
}
