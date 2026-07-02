using MediatR;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration.DTOs;

namespace SICST.Application.Modules.Configuration.Queries;

public record SuggestContractingModeQuery(Guid CompanyId, decimal Amount) : IRequest<ContractingModeDto?>;

public class SuggestContractingModeQueryHandler : IRequestHandler<SuggestContractingModeQuery, ContractingModeDto?>
{
    private readonly IApplicationDbContext _context;

    public SuggestContractingModeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractingModeDto?> Handle(SuggestContractingModeQuery request, CancellationToken cancellationToken)
    {
        if (request.Amount < 0)
        {
            throw new InvalidOperationException("El monto no puede ser negativo.");
        }

        var mode = await ContractingModeRules.FindSuggestedMode(
            _context,
            request.CompanyId,
            request.Amount,
            cancellationToken);

        return mode == null ? null : ContractingModeRules.ToDto(mode);
    }
}
