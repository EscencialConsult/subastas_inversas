using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public.Queries;

public record GetPublicPurchaseProcessDetailQuery(Guid PurchaseProcessId) : IRequest<PublicPurchaseProcessDetailDto?>;

public class GetPublicPurchaseProcessDetailQueryHandler
    : IRequestHandler<GetPublicPurchaseProcessDetailQuery, PublicPurchaseProcessDetailDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPublicPurchaseProcessDetailQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicPurchaseProcessDetailDto?> Handle(
        GetPublicPurchaseProcessDetailQuery request,
        CancellationToken cancellationToken)
    {
        var publicStatuses = GetPublicPurchaseProcessesQueryHandler.PublicStatuses;

        var process = await _context.PurchaseProcesses
            .Include(p => p.Company)
            .Include(p => p.Items)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.Items)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId
                && publicStatuses.Contains(p.Status), cancellationToken);

        if (process == null)
        {
            return null;
        }

        var auction = await _context.Auctions
            .Include(a => a.PurchaseProcess).ThenInclude(p => p.Company)
            .Include(a => a.Participants).ThenInclude(p => p.Supplier)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.PurchaseProcessId == process.Id, cancellationToken);

        return new PublicPurchaseProcessDetailDto
        {
            Id = process.Id,
            CompanyId = process.CompanyId,
            CompanyName = process.Company.Name,
            Code = process.Code,
            Title = process.Title,
            Description = process.Description,
            EstimatedBudget = process.EstimatedBudget,
            Status = process.Status,
            CreatedAtUtc = process.CreatedAtUtc,
            PublishedAtUtc = process.PublishedAtUtc,
            ClosedAtUtc = process.ClosedAtUtc,
            SpecificationsHash = process.SpecificationsHash ?? string.Empty,
            HasAuction = auction != null,
            Items = process.Items
                .OrderBy(i => i.Description)
                .Select(i => new PublicPurchaseItemDto
                {
                    Id = i.Id,
                    Description = i.Description,
                    Quantity = i.Quantity,
                    Unit = i.Unit,
                    EstimatedUnitPrice = i.EstimatedUnitPrice,
                    EstimatedTotal = i.EstimatedUnitPrice.HasValue
                        ? i.EstimatedUnitPrice.Value * i.Quantity
                        : null
                })
                .ToList(),
            Auction = auction == null ? null : MapAuction(auction),
            Awards = process.Awards
                .OrderByDescending(a => a.AdjudicatedAtUtc)
                .Select(a => new PublicAwardDto
                {
                    Id = a.Id,
                    PurchaseProcessId = a.PurchaseProcessId,
                    CompanyId = process.CompanyId,
                    CompanyName = process.Company.Name,
                    ProcessCode = process.Code,
                    ProcessTitle = process.Title,
                    SupplierName = a.Supplier.BusinessName,
                    Amount = a.Amount,
                    AdjudicatedAtUtc = a.AdjudicatedAtUtc,
                    Observations = a.Observations,
                    ActUrl = $"/api/companies/{process.CompanyId}/purchase-processes/{process.Id}/awards/{a.Id}/pdf"
                })
                .ToList()
        };
    }

    private static PublicAuctionDto MapAuction(Auction auction)
    {
        var snapshot = PublicAuctionSnapshotMapping.ToSnapshot(auction);
        return new PublicAuctionDto
        {
            Id = snapshot.Id,
            PurchaseProcessId = snapshot.PurchaseProcessId,
            CompanyId = snapshot.CompanyId,
            CompanyName = snapshot.CompanyName,
            ProcessCode = snapshot.ProcessCode,
            ProcessTitle = snapshot.ProcessTitle,
            BasePrice = snapshot.BasePrice,
            CurrentPrice = snapshot.CurrentPrice,
            Status = snapshot.Status,
            StartsAtUtc = snapshot.StartsAtUtc,
            EndsAtUtc = snapshot.EndsAtUtc,
            BidCount = snapshot.BidCount,
            EventsUrl = $"/api/v1/public/auctions/{snapshot.Id}/events",
            IdentitiesRevealed = snapshot.IdentitiesRevealed,
            Ranking = snapshot.Ranking
        };
    }
}
