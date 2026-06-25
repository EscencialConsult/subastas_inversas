using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Configuration.Commands;

public record DeleteContractingModeCommand(Guid CompanyId, Guid Id) : IRequest;

public class DeleteContractingModeCommandHandler : IRequestHandler<DeleteContractingModeCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteContractingModeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteContractingModeCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.ContractingModes
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.CompanyId == request.CompanyId, cancellationToken);

        if (entity == null)
        {
            throw new InvalidOperationException("Modalidad no encontrada.");
        }

        var inUse = await _context.PurchaseProcesses
            .AnyAsync(p => p.CompanyId == request.CompanyId && p.ContractingModeId == request.Id, cancellationToken);

        if (inUse)
        {
            entity.Active = false;
        }
        else
        {
            _context.ContractingModes.Remove(entity);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
