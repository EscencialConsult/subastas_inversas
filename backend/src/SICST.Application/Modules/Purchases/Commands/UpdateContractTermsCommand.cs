using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record UpdateContractTermsCommand : IRequest<ContractDto?>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public Guid ContractId { get; init; }
    public string Terms { get; init; } = string.Empty;
    public DateTime? EndDateUtc { get; init; }
}

public class UpdateContractTermsCommandHandler : IRequestHandler<UpdateContractTermsCommand, ContractDto?>
{
    private readonly IApplicationDbContext _context;

    public UpdateContractTermsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractDto?> Handle(UpdateContractTermsCommand request, CancellationToken cancellationToken)
    {
        var contract = await _context.Contracts
            .Include(c => c.Supplier)
            .FirstOrDefaultAsync(c =>
                c.Id == request.ContractId &&
                c.PurchaseProcessId == request.PurchaseProcessId &&
                c.CompanyId == request.CompanyId,
                cancellationToken);

        if (contract == null)
        {
            return null;
        }

        if (contract.Status != ContractStatus.Draft)
        {
            throw new InvalidOperationException("Solo se pueden modificar las clausulas de contratos en estado borrador.");
        }

        contract.Terms = request.Terms.Trim();
        if (request.EndDateUtc.HasValue)
        {
            contract.EndDateUtc = request.EndDateUtc;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToContractDto(contract);
    }
}
