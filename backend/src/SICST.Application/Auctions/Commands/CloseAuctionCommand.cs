using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Application.Auctions.Commands;

public record CloseAuctionCommand(Guid CompanyId, Guid AuctionId) : IRequest<AuctionDto?>;

public class CloseAuctionCommandHandler : IRequestHandler<CloseAuctionCommand, AuctionDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuctionStateCache _cache;

    public CloseAuctionCommandHandler(IApplicationDbContext context, IAuctionStateCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<AuctionDto?> Handle(CloseAuctionCommand request, CancellationToken cancellationToken)
    {
        var auction = await _context.Auctions
            .Include(a => a.Participants)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.Id == request.AuctionId && a.CompanyId == request.CompanyId, cancellationToken);

        if (auction == null)
        {
            return null;
        }

        if (auction.Status == AuctionStatus.Closed)
        {
            throw new InvalidOperationException("La subasta ya esta cerrada.");
        }

        auction.Status = AuctionStatus.Closed;
        auction.ClosedAtUtc = DateTime.UtcNow;

        var process = await _context.PurchaseProcesses.FirstAsync(p => p.Id == auction.PurchaseProcessId, cancellationToken);
        process.Status = PurchaseProcessStatus.Closed;
        process.ClosedAtUtc = auction.ClosedAtUtc;

        await _context.SaveChangesAsync(cancellationToken);

        var dto = AuctionMapping.ToDto(auction);
        await _cache.SetAsync(new AuctionState(auction.Id, dto.CurrentPrice, auction.EndsAtUtc, false), cancellationToken);

        return dto;
    }
}
