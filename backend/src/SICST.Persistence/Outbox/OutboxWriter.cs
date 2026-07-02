using System.Text.Json;
using SICST.Application.Common.Events;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;
using SICST.Persistence.Contexts;

namespace SICST.Persistence.Outbox;

public sealed class OutboxWriter : IOutboxWriter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ApplicationDbContext _context;

    public OutboxWriter(ApplicationDbContext context)
    {
        _context = context;
    }

    public void Add(IApplicationEvent applicationEvent)
    {
        _context.OutboxMessages.Add(new OutboxMessage
        {
            Id = applicationEvent.EventId,
            CompanyId = applicationEvent.CompanyId,
            EventType = applicationEvent.GetType().Name,
            Payload = JsonSerializer.Serialize(applicationEvent, applicationEvent.GetType(), JsonOptions),
            IdempotencyKey = applicationEvent.IdempotencyKey,
            Status = OutboxMessageStatus.Pending,
            CreatedAtUtc = applicationEvent.OccurredAtUtc,
            AvailableAtUtc = applicationEvent.OccurredAtUtc
        });
    }
}
