using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record ClosePurchaseProcessCommand(Guid CompanyId, Guid Id) : IRequest<PurchaseProcessDto?>;

public class ClosePurchaseProcessCommandHandler : IRequestHandler<ClosePurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public ClosePurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(ClosePurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status == PurchaseProcessStatus.Closed)
        {
            throw new InvalidOperationException("El proceso ya esta cerrado.");
        }

        process.Status = PurchaseProcessStatus.Closed;
        process.ClosedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
