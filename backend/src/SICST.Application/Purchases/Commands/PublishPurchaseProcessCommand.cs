using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record PublishPurchaseProcessCommand(Guid CompanyId, Guid Id) : IRequest<PurchaseProcessDto?>;

public class PublishPurchaseProcessCommandHandler : IRequestHandler<PublishPurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public PublishPurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(PublishPurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Draft)
        {
            throw new InvalidOperationException("Solo se puede publicar un proceso en borrador.");
        }

        process.Status = PurchaseProcessStatus.PendingApproval;
        process.PublishedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
