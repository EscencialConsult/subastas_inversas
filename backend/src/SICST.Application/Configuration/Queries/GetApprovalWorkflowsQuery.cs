using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;

namespace SICST.Application.Configuration.Queries;

public record GetApprovalWorkflowsQuery(Guid CompanyId) : IRequest<List<ApprovalWorkflowDto>>;

public class GetApprovalWorkflowsQueryHandler : IRequestHandler<GetApprovalWorkflowsQuery, List<ApprovalWorkflowDto>>
{
    private readonly IApplicationDbContext _context;

    public GetApprovalWorkflowsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApprovalWorkflowDto>> Handle(GetApprovalWorkflowsQuery request, CancellationToken cancellationToken)
    {
        return await _context.ApprovalWorkflows
            .Where(w => w.CompanyId == request.CompanyId)
            .OrderBy(w => w.MinAmount)
            .ThenBy(w => w.Name)
            .Select(w => new ApprovalWorkflowDto
            {
                Id = w.Id,
                CompanyId = w.CompanyId,
                Name = w.Name,
                MinAmount = w.MinAmount,
                MaxAmount = w.MaxAmount,
                RequiredRole = w.RequiredRole,
                RequiredApprovals = w.RequiredApprovals,
                Active = w.Active
            })
            .ToListAsync(cancellationToken);
    }
}
