using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Public.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Public.Queries;

public record GetPublicOcdsReleasesQuery(Guid? CompanyId = null, string? Stage = null) : IRequest<OcdsReleasePackageDto>;

public class GetPublicOcdsReleasesQueryHandler
    : IRequestHandler<GetPublicOcdsReleasesQuery, OcdsReleasePackageDto>
{
    private readonly IApplicationDbContext _context;

    public GetPublicOcdsReleasesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OcdsReleasePackageDto> Handle(
        GetPublicOcdsReleasesQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.PurchaseProcesses
            .Include(p => p.Company)
            .Include(p => p.Items)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Contracts).ThenInclude(c => c.Supplier)
            .Include(p => p.Contracts).ThenInclude(c => c.Payments)
            .Where(p => GetPublicPurchaseProcessesQueryHandler.PublicStatuses.Contains(p.Status));

        if (request.CompanyId.HasValue)
        {
            query = query.Where(p => p.CompanyId == request.CompanyId.Value);
        }

        var processes = await query
            .OrderByDescending(p => p.PublishedAtUtc ?? p.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var processIds = processes.Select(p => p.Id).ToList();
        var auctions = await _context.Auctions
            .Include(a => a.Bids)
            .Where(a => processIds.Contains(a.PurchaseProcessId))
            .ToDictionaryAsync(a => a.PurchaseProcessId, cancellationToken);

        var releases = processes
            .Select(p => MapRelease(p, auctions.GetValueOrDefault(p.Id)))
            .Where(r => string.IsNullOrWhiteSpace(request.Stage) ||
                r.Tag.Contains(request.Stage.Trim().ToLowerInvariant()))
            .ToList();

        return new OcdsReleasePackageDto
        {
            Uri = "/api/public/ocds/releases",
            PublishedDateUtc = DateTime.UtcNow,
            Extensions = ["https://extensions.open-contracting.org/en/extensions/ocds_bid_extension/master/"],
            Releases = releases
        };
    }

    private static OcdsReleaseDto MapRelease(PurchaseProcess process, Auction? auction)
    {
        var tags = GetTags(process, auction);
        return new OcdsReleaseDto
        {
            Ocid = $"ocds-sicst-{process.CompanyId:N}-{process.Id:N}",
            Id = $"{process.Code}-{process.Status}",
            Date = process.PublishedAtUtc ?? process.CreatedAtUtc,
            Tag = tags,
            Buyer = new OcdsPartyDto
            {
                Id = process.CompanyId.ToString(),
                Name = process.Company.Name
            },
            Tender = new OcdsTenderDto
            {
                Id = process.Id.ToString(),
                Title = process.Title,
                Description = process.Description,
                Status = MapTenderStatus(process.Status),
                ValueAmount = process.EstimatedBudget,
                DatePublished = process.PublishedAtUtc,
                Items = process.Items
                    .OrderBy(i => i.Description)
                    .Select(i => new OcdsItemDto
                    {
                        Id = i.Id.ToString(),
                        Description = i.Description,
                        Quantity = i.Quantity,
                        UnitName = i.Unit,
                        UnitValueAmount = i.EstimatedUnitPrice
                    })
                    .ToList(),
                Auction = auction == null ? null : new OcdsAuctionDto
                {
                    Id = auction.Id.ToString(),
                    Status = auction.Status.ToString(),
                    BasePrice = auction.BasePrice,
                    CurrentPrice = auction.Bids.Count == 0 ? auction.BasePrice : auction.Bids.Min(b => b.Amount),
                    BidCount = auction.Bids.Count,
                    StartsAtUtc = auction.StartsAtUtc,
                    EndsAtUtc = auction.EndsAtUtc
                }
            },
            Awards = process.Awards
                .OrderByDescending(a => a.AdjudicatedAtUtc)
                .Select(a => new OcdsAwardDto
                {
                    Id = a.Id.ToString(),
                    Date = a.AdjudicatedAtUtc,
                    ValueAmount = a.Amount,
                    Supplier = new OcdsPartyDto
                    {
                        Id = a.SupplierId.ToString(),
                        Name = a.Supplier.BusinessName
                    }
                })
                .ToList(),
            Contracts = process.Contracts
                .OrderByDescending(c => c.SignedAtUtc ?? c.CreatedAtUtc)
                .Select(c => new OcdsContractDto
                {
                    Id = c.Id.ToString(),
                    AwardId = c.AwardId.ToString(),
                    Status = c.Status.ToString(),
                    DateSigned = c.SignedAtUtc ?? c.CreatedAtUtc,
                    ValueAmount = c.Amount
                })
                .ToList(),
            Implementation = new OcdsImplementationDto
            {
                Transactions = process.Contracts
                    .SelectMany(c => c.Payments)
                    .OrderByDescending(p => p.PaymentDateUtc)
                    .Select(p => new OcdsTransactionDto
                    {
                        Id = p.Id.ToString(),
                        Date = p.PaymentDateUtc,
                        ValueAmount = p.PaymentAmount,
                        Source = "contractPayment"
                    })
                    .ToList()
            }
        };
    }

    private static List<string> GetTags(PurchaseProcess process, Auction? auction)
    {
        var tags = new List<string> { "planning", "tender" };
        if (auction != null)
        {
            tags.Add("auction");
        }

        if (process.Awards.Count > 0)
        {
            tags.Add("award");
        }

        if (process.Contracts.Count > 0)
        {
            tags.Add("contract");
        }

        if (process.Contracts.SelectMany(c => c.Payments).Any())
        {
            tags.Add("implementation");
        }

        return tags;
    }

    private static string MapTenderStatus(PurchaseProcessStatus status)
    {
        return status switch
        {
            PurchaseProcessStatus.Deserted => "unsuccessful",
            PurchaseProcessStatus.SuspendedByChallenge => "cancelled",
            PurchaseProcessStatus.Rejected => "cancelled",
            PurchaseProcessStatus.Closed => "complete",
            PurchaseProcessStatus.Adjudicated => "complete",
            PurchaseProcessStatus.Contracted => "complete",
            PurchaseProcessStatus.PurchaseOrderIssued => "complete",
            PurchaseProcessStatus.Received => "complete",
            _ => "active"
        };
    }
}
