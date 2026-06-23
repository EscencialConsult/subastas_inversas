using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Audit.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Audit.Queries;

public record GetAuditEventsQuery(
    Guid? CompanyId = null,
    string? EntityName = null,
    AuditEventAction? Action = null,
    DateTime? FromUtc = null,
    DateTime? ToUtc = null,
    int Limit = 200) : IRequest<List<AuditEventDto>>;

public class GetAuditEventsQueryHandler : IRequestHandler<GetAuditEventsQuery, List<AuditEventDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAuditEventsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AuditEventDto>> Handle(GetAuditEventsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.AuditEvents.AsQueryable();

        if (request.CompanyId.HasValue)
        {
            query = query.Where(e => e.CompanyId == request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            var entityName = request.EntityName.Trim();
            query = query.Where(e => e.EntityName == entityName);
        }

        if (request.Action.HasValue)
        {
            query = query.Where(e => e.Action == request.Action.Value);
        }

        if (request.FromUtc.HasValue)
        {
            query = query.Where(e => e.CreatedAtUtc >= request.FromUtc.Value);
        }

        if (request.ToUtc.HasValue)
        {
            query = query.Where(e => e.CreatedAtUtc <= request.ToUtc.Value);
        }

        var limit = Math.Clamp(request.Limit, 1, 1000);

        return await query
            .OrderByDescending(e => e.Sequence)
            .Take(limit)
            .Select(e => new AuditEventDto
            {
                Id = e.Id,
                Sequence = e.Sequence,
                CompanyId = e.CompanyId,
                EntityName = e.EntityName,
                EntityId = e.EntityId,
                Action = e.Action,
                Payload = e.Payload,
                CreatedAtUtc = e.CreatedAtUtc,
                PreviousHash = e.PreviousHash,
                Hash = e.Hash
            })
            .ToListAsync(cancellationToken);
    }
}
