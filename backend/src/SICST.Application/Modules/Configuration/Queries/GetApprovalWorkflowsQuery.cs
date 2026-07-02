using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration;
using SICST.Application.Modules.Configuration.DTOs;

namespace SICST.Application.Modules.Configuration.Queries;

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
        var workflows = await _context.ApprovalWorkflows
            .Include(w => w.Levels)
            .Where(w => w.CompanyId == request.CompanyId)
            .OrderBy(w => w.MinAmount)
            .ThenBy(w => w.Name)
            .ToListAsync(cancellationToken);

        return workflows.Select(ApprovalWorkflowRules.ToDto).ToList();
    }
}
