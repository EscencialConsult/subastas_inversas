using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions.Commands;

public record StartAuctionCommand : IRequest<AuctionDto>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public decimal BasePrice { get; init; }
    public decimal MinimumDecrementPercentage { get; init; }
    public DateTime StartsAtUtc { get; init; }
    public int DurationMinutes { get; init; }
    public int AutoExtensionMinutes { get; init; }
    public decimal PabThreshold { get; init; }
}

public class StartAuctionCommandHandler : IRequestHandler<StartAuctionCommand, AuctionDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuctionStateCache _cache;
    private readonly IPublicAuctionSnapshotCache? _publicSnapshotCache;

    public StartAuctionCommandHandler(
        IApplicationDbContext context,
        IAuctionStateCache cache,
        IPublicAuctionSnapshotCache? publicSnapshotCache = null)
    {
        _context = context;
        _cache = cache;
        _publicSnapshotCache = publicSnapshotCache;
    }

    public async Task<AuctionDto> Handle(StartAuctionCommand request, CancellationToken cancellationToken)
    {
        if (request.DurationMinutes <= 0)
        {
            throw new InvalidOperationException("La duracion de la subasta debe ser mayor a cero.");
        }

        var process = await _context.PurchaseProcesses
            .Include(p => p.Company)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            throw new InvalidOperationException("Proceso de compra no encontrado.");
        }

        if (process.Status != PurchaseProcessStatus.Approved)
        {
            throw new InvalidOperationException("Solo se puede iniciar subasta de un proceso aprobado.");
        }

        if (!process.IsEvaluationActSigned)
        {
            throw new InvalidOperationException("No se puede iniciar la subasta porque el acta de evaluación no ha sido generada y firmada.");
        }

        var exists = await _context.Auctions.AnyAsync(a => a.PurchaseProcessId == request.PurchaseProcessId, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Este proceso ya tiene una subasta.");
        }

        var invitations = await _context.Invitations
            .Include(i => i.Supplier)
            .Where(i => i.PurchaseProcessId == request.PurchaseProcessId
                && i.Status == Domain.Entities.InvitationStatus.Accepted
                && i.QualificationStatus == Domain.Entities.QualificationStatus.Approved)
            .ToListAsync(cancellationToken);

        var configuration = await _context.CompanyConfigurations
            .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId, cancellationToken);

        var basePrice = request.BasePrice <= 0 ? process.EstimatedBudget : request.BasePrice;
        if (basePrice <= 0)
        {
            throw new InvalidOperationException("El precio base debe ser mayor a cero.");
        }

        var minDecrement = request.MinimumDecrementPercentage <= 0
            ? (configuration?.MinimumBidDecrementPercentage ?? 1)
            : request.MinimumDecrementPercentage;

        if (minDecrement < 0 || minDecrement > 100)
        {
            throw new InvalidOperationException("El decremento mínimo debe estar entre 0% y 100%.");
        }

        var autoExtension = request.AutoExtensionMinutes <= 0
            ? (configuration?.AuctionExtensionMinutes ?? 3)
            : request.AutoExtensionMinutes;

        if (autoExtension < 0)
        {
            throw new InvalidOperationException("La duración de la extensión automática no puede ser negativa.");
        }

        if (request.PabThreshold < 0)
        {
            throw new InvalidOperationException("El umbral PAB no puede ser negativo.");
        }

        var now = DateTime.UtcNow;
        var startsAt = request.StartsAtUtc == default ? now : request.StartsAtUtc.ToUniversalTime();
        var endsAt = startsAt.AddMinutes(request.DurationMinutes);
        var status = startsAt > now ? AuctionStatus.Scheduled : AuctionStatus.Open;

        var auction = new Auction
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            PurchaseProcessId = request.PurchaseProcessId,
            BasePrice = basePrice,
            MinimumDecrementPercentage = minDecrement,
            Status = status,
            StartsAtUtc = startsAt,
            EndsAtUtc = endsAt,
            AutoExtensionMinutes = autoExtension,
            PabThreshold = request.PabThreshold,
            PurchaseProcess = process,
            Participants = invitations.Select(i => new AuctionParticipant
            {
                Id = Guid.NewGuid(),
                SupplierId = i.SupplierId,
                Supplier = i.Supplier,
                Active = true,
                JoinedAtUtc = startsAt
            }).ToList()
        };

        if (status == AuctionStatus.Open)
        {
            process.Status = PurchaseProcessStatus.InAuction;
        }

        _context.Auctions.Add(auction);
        await _context.SaveChangesAsync(cancellationToken);
        await _cache.SetAsync(new AuctionState(auction.Id, auction.BasePrice, auction.EndsAtUtc, status == AuctionStatus.Open), cancellationToken);
        if (_publicSnapshotCache != null)
        {
            await _publicSnapshotCache.SetAsync(PublicAuctionSnapshotMapping.ToSnapshot(auction), cancellationToken);
        }

        return AuctionMapping.ToDto(auction);
    }
}
