namespace SICST.Application.Common.Events;

public interface IApplicationEvent
{
    Guid EventId { get; }

    Guid? CompanyId { get; }

    DateTime OccurredAtUtc { get; }

    string IdempotencyKey { get; }
}
