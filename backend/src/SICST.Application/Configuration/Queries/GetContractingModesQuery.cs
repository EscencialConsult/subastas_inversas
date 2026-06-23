using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;

namespace SICST.Application.Configuration.Queries;

public record GetContractingModesQuery(Guid CompanyId) : IRequest<List<ContractingModeDto>>;

public class GetContractingModesQueryHandler : IRequestHandler<GetContractingModesQuery, List<ContractingModeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetContractingModesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ContractingModeDto>> Handle(GetContractingModesQuery request, CancellationToken cancellationToken)
    {
        return await _context.ContractingModes
            .Where(m => m.CompanyId == request.CompanyId)
            .OrderBy(m => m.Name)
            .Select(m => new ContractingModeDto
            {
                Id = m.Id,
                CompanyId = m.CompanyId,
                Name = m.Name,
                Description = m.Description,
                RequiresAuction = m.RequiresAuction,
                Active = m.Active
            })
            .ToListAsync(cancellationToken);
    }
}
