using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record SuspendPurchaseProcessByChallengeCommand(Guid CompanyId, Guid Id, Guid OperatorId, string Fundamento)
    : IRequest<PurchaseProcessDto?>;

public class SuspendPurchaseProcessByChallengeCommandHandler
    : IRequestHandler<SuspendPurchaseProcessByChallengeCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public SuspendPurchaseProcessByChallengeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(SuspendPurchaseProcessByChallengeCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Fundamento))
        {
            throw new InvalidOperationException("Debe indicar el fundamento de la impugnacion.");
        }

        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status is PurchaseProcessStatus.Draft or
            PurchaseProcessStatus.Rejected or
            PurchaseProcessStatus.Deserted or
            PurchaseProcessStatus.SuspendedByChallenge or
            PurchaseProcessStatus.Contracted or
            PurchaseProcessStatus.PurchaseOrderIssued or
            PurchaseProcessStatus.Received)
        {
            throw new InvalidOperationException("El proceso no se puede suspender por impugnacion en su estado actual.");
        }

        var operatorUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.OperatorId && u.Active, cancellationToken);

        if (operatorUser == null || operatorUser.CompanyId != request.CompanyId)
        {
            throw new InvalidOperationException("Operador no encontrado para la empresa.");
        }

        await CloseOpenAuction(process.Id, cancellationToken);

        process.Status = PurchaseProcessStatus.SuspendedByChallenge;
        process.RejectionReason = request.Fundamento.Trim();

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
