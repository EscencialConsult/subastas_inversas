using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions.Commands;

public record StartAuctionCommand : IRequest<AuctionDto>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public int DurationMinutes { get; init; } = 10;
}

public class StartAuctionCommandHandler : IRequestHandler<StartAuctionCommand, AuctionDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuctionStateCache _cache;

    public StartAuctionCommandHandler(IApplicationDbContext context, IAuctionStateCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<AuctionDto> Handle(StartAuctionCommand request, CancellationToken cancellationToken)
    {
        if (request.DurationMinutes <= 0)
        {
            throw new InvalidOperationException("La duracion de la subasta debe ser mayor a cero.");
        }

        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            throw new InvalidOperationException("Proceso de compra no encontrado.");
        }

        if (process.Status != PurchaseProcessStatus.Approved)
        {
            throw new InvalidOperationException("Solo se puede iniciar subasta de un proceso aprobado.");
        }

        var exists = await _context.Auctions.AnyAsync(a => a.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Este proceso ya tiene una subasta.");
        }

        var invitations = await _context.Invitations
            .Where(i => i.PurchaseProcessId == request.PurchaseProcessId
                && i.Status == Domain.Entities.InvitationStatus.Accepted
                && i.QualificationStatus == Domain.Entities.QualificationStatus.Approved)
            .ToListAsync(cancellationToken);

        var configuration = await _context.CompanyConfigurations
            .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId, cancellationToken);

        var now = DateTime.UtcNow;
        var auction = new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            PurchaseProcessId = request.PurchaseProcessId,
            BasePrice = process.EstimatedBudget,
            MinimumDecrementPercentage = configuration?.MinimumBidDecrementPercentage ?? 1,
            Status = AuctionStatus.Open,
            StartsAtUtc = now,
            EndsAtUtc = now.AddMinutes(request.DurationMinutes),
            Participants = invitations.Select(i => new AuctionParticipant
            {
                Id = Guid.NewGuid(),
                SupplierId = i.SupplierId,
                Active = true,
                JoinedAtUtc = now
            }).ToList()
        };

        process.Status = PurchaseProcessStatus.InAuction;
        _context.Auctions.Add(auction);
        await _context.SaveChangesAsync(cancellationToken);
        await _cache.SetAsync(new AuctionState(auction.Id, auction.BasePrice, auction.EndsAtUtc, true), cancellationToken);

        return AuctionMapping.ToDto(auction);
    }
}
