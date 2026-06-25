using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Audit.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Audit.Queries;

public record GetAccessLogsQuery(
    Guid? CompanyId = null,
    string? Email = null,
    AccessLogEventType? EventType = null,
    bool? Success = null,
    DateTime? FromUtc = null,
    DateTime? ToUtc = null,
    int Limit = 200) : IRequest<List<AccessLogDto>>;

public class GetAccessLogsQueryHandler : IRequestHandler<GetAccessLogsQuery, List<AccessLogDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAccessLogsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AccessLogDto>> Handle(GetAccessLogsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.AccessLogs.AsQueryable();

        if (request.CompanyId.HasValue)
        {
            query = query.Where(e => e.CompanyId == request.CompanyId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim().ToLower();
            query = query.Where(e => e.Email.Contains(email));
        }

        if (request.EventType.HasValue)
        {
            query = query.Where(e => e.EventType == request.EventType.Value);
        }

        if (request.Success.HasValue)
        {
            query = query.Where(e => e.Success == request.Success.Value);
        }

        if (request.FromUtc.HasValue)
        {
            query = query.Where(e => e.OccurredAtUtc >= request.FromUtc.Value);
        }

        if (request.ToUtc.HasValue)
        {
            query = query.Where(e => e.OccurredAtUtc <= request.ToUtc.Value);
        }

        var limit = Math.Clamp(request.Limit, 1, 1000);

        return await query
            .OrderByDescending(e => e.OccurredAtUtc)
            .Take(limit)
            .Select(e => new AccessLogDto
            {
                Id = e.Id,
                UserId = e.UserId,
                CompanyId = e.CompanyId,
                Email = e.Email,
                EventType = e.EventType,
                Success = e.Success,
                FailureReason = e.FailureReason,
                IpAddress = e.IpAddress,
                UserAgent = e.UserAgent,
                OccurredAtUtc = e.OccurredAtUtc
            })
            .ToListAsync(cancellationToken);
    }
}
