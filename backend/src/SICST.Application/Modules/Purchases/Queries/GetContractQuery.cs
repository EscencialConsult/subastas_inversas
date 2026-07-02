using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;

namespace SICST.Application.Modules.Purchases.Queries;

public record GetContractQuery : IRequest<ContractDto?>
{
    public Guid CompanyId { get; init; }
    public Guid ContractId { get; init; }
}

public class GetContractQueryHandler : IRequestHandler<GetContractQuery, ContractDto?>
{
    private readonly IApplicationDbContext _context;

    public GetContractQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractDto?> Handle(GetContractQuery request, CancellationToken cancellationToken)
    {
        var contract = await _context.Contracts
            .Include(c => c.Supplier)
            .FirstOrDefaultAsync(c => c.Id == request.ContractId && c.CompanyId == request.CompanyId, cancellationToken);

        if (contract == null)
        {
            return null;
        }

        return PurchaseProcessMapping.ToContractDto(contract);
    }
}
