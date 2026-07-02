using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Queries;

public record GetProcessesForQualificationQuery(Guid CompanyId, string? Search) : IRequest<List<PurchaseProcessDto>>;

public class GetProcessesForQualificationQueryHandler : IRequestHandler<GetProcessesForQualificationQuery, List<PurchaseProcessDto>>
{
    private readonly IApplicationDbContext _context;

    public GetProcessesForQualificationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PurchaseProcessDto>> Handle(GetProcessesForQualificationQuery request, CancellationToken cancellationToken)
    {
        var processIdsWithAcceptedInvitations = await _context.Invitations
            .Where(i => i.PurchaseProcess.CompanyId == request.CompanyId && i.Status == InvitationStatus.Accepted)
            .Select(i => i.PurchaseProcessId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var query = _context.PurchaseProcesses
            .Where(p => processIdsWithAcceptedInvitations.Contains(p.Id))
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Title.ToLower().Contains(search) || p.Code.ToLower().Contains(search));
        }

        return await query
            .OrderByDescending(p => p.CreatedAtUtc)
            .Select(p => new PurchaseProcessDto
            {
                Id = p.Id,
                CompanyId = p.CompanyId,
                BuyerId = p.BuyerId,
                ContractingModeId = p.ContractingModeId,
                Code = p.Code,
                Title = p.Title,
                Description = p.Description,
                EstimatedBudget = p.EstimatedBudget,
                Status = p.Status,
                CreatedAtUtc = p.CreatedAtUtc,
                PublishedAtUtc = p.PublishedAtUtc,
                ClosedAtUtc = p.ClosedAtUtc,
                RejectionReason = p.RejectionReason,
                HasAuction = false
            })
            .ToListAsync(cancellationToken);
    }
}
