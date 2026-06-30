using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record DeclarePurchaseProcessDesertedCommand(Guid CompanyId, Guid Id, Guid OperatorId, string Fundamento)
    : IRequest<PurchaseProcessDto?>;

public class DeclarePurchaseProcessDesertedCommandHandler
    : IRequestHandler<DeclarePurchaseProcessDesertedCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public DeclarePurchaseProcessDesertedCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(DeclarePurchaseProcessDesertedCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Fundamento))
        {
            throw new InvalidOperationException("Debe indicar el fundamento para declarar desierto el proceso.");
        }

        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Awards)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Awards.Count > 0 ||
            process.Status is PurchaseProcessStatus.Adjudicated or
                PurchaseProcessStatus.Contracted or
                PurchaseProcessStatus.PurchaseOrderIssued or
                PurchaseProcessStatus.Received)
        {
            throw new InvalidOperationException("No se puede declarar desierto un proceso con adjudicacion registrada.");
        }

        if (process.Status is PurchaseProcessStatus.Deserted or PurchaseProcessStatus.SuspendedByChallenge)
        {
            throw new InvalidOperationException("El proceso ya fue resuelto por una excepcion.");
        }

        var operatorUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.OperatorId && u.Active, cancellationToken);

        if (operatorUser == null || operatorUser.CompanyId != request.CompanyId)
        {
            throw new InvalidOperationException("Operador no encontrado para la empresa.");
        }

        await CloseOpenAuction(process.Id, cancellationToken);

        process.Status = PurchaseProcessStatus.Deserted;
        process.RejectionReason = request.Fundamento.Trim();
        process.ClosedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return PurchaseProcessMapping.ToDto(process);
    }

    private async Task CloseOpenAuction(Guid purchaseProcessId, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .FirstOrDefaultAsync(a => a.PurchaseProcessId == purchaseProcessId && a.Status != AuctionStatus.Closed, cancellationToken);

        if (auction != null)
        {
            auction.Status = AuctionStatus.Closed;
            auction.ClosedAtUtc = DateTime.UtcNow;
        }
    }
}
