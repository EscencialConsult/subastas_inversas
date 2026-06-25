using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record AdjudicateProcessCommand(
    Guid CompanyId,
    Guid Id,
    Guid AprobadorId,
    List<AwardSelectionInputDto>? Awards = null) : IRequest<PurchaseProcessDto?>;

public class AwardSelectionInputDto
{
    public Guid SupplierId { get; set; }
    public List<AwardItemInputDto> Items { get; set; } = [];
}

public class AwardItemInputDto
{
    public Guid PurchaseItemId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class AdjudicateProcessCommandHandler : IRequestHandler<AdjudicateProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;

    public AdjudicateProcessCommandHandler(IApplicationDbContext context, IPdfGenerator pdfGenerator)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
    }

    public async Task<PurchaseProcessDto?> Handle(AdjudicateProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation)
            .Include(p => p.Awards)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Evaluation)
        {
            throw new InvalidOperationException("Solo se pueden adjudicar procesos que esten en etapa de evaluacion.");
        }

        if (process.Evaluation == null)
        {
            throw new InvalidOperationException("No se puede adjudicar sin una recomendacion de evaluacion previa.");
        }

        if (process.Awards.Count > 0)
        {
            throw new InvalidOperationException("Este proceso ya fue adjudicado.");
        }

        var approver = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.AprobadorId, cancellationToken);
        if (approver == null)
        {
            throw new InvalidOperationException("Autoridad aprobatoria no encontrada.");
        }

        var auction = await _context.Auctions
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .FirstOrDefaultAsync(a => a.PurchaseProcessId == process.Id, cancellationToken);

        var recommendedSupplierName = process.Evaluation.RecommendedSupplier;
        var winningBid = auction?.Bids
            .FirstOrDefault(b => b.Supplier.BusinessName.Trim().Equals(recommendedSupplierName.Trim(), StringComparison.OrdinalIgnoreCase));

        var recommendedSupplier = winningBid?.Supplier ?? await _context.Suppliers
            .FirstOrDefaultAsync(s => s.BusinessName.Trim().Equals(recommendedSupplierName.Trim(), StringComparison.OrdinalIgnoreCase), cancellationToken);

        if (recommendedSupplier == null)
        {
            throw new InvalidOperationException($"No se pudo encontrar en el sistema al proveedor recomendado '{recommendedSupplierName}'.");
        }

        var selections = request.Awards?.Count > 0
            ? request.Awards
            : [BuildDefaultSelection(process, recommendedSupplier.Id, winningBid?.Amount ?? process.EstimatedBudget)];

        var purchaseItems = process.Items.ToDictionary(i => i.Id);
        var awardedItemIds = new HashSet<Guid>();
        var createdAwards = new List<Award>();
        var bids = auction?.Bids.OrderBy(b => b.Amount).ToList() ?? [];

        foreach (var selection in selections)
        {
            var supplier = selection.SupplierId == recommendedSupplier.Id
                ? recommendedSupplier
                : await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == selection.SupplierId, cancellationToken);

            if (supplier == null)
            {
                throw new InvalidOperationException("Uno de los proveedores adjudicados no existe.");
            }

            if (selection.Items.Count == 0 && process.Items.Count > 0)
            {
                throw new InvalidOperationException("Cada adjudicacion debe incluir al menos un item.");
            }

            var awardItems = new List<AwardItem>();
            foreach (var item in selection.Items)
            {
                if (!purchaseItems.TryGetValue(item.PurchaseItemId, out var purchaseItem))
                {
                    throw new InvalidOperationException("La adjudicacion contiene items que no pertenecen al proceso.");
                }

                if (!awardedItemIds.Add(item.PurchaseItemId))
                {
                    throw new InvalidOperationException($"El item '{purchaseItem.Description}' fue adjudicado mas de una vez.");
                }

                if (item.Quantity <= 0 || item.Quantity > purchaseItem.Quantity)
                {
                    throw new InvalidOperationException($"La cantidad adjudicada para '{purchaseItem.Description}' es invalida.");
                }

                var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : purchaseItem.EstimatedUnitPrice ?? 0;
                awardItems.Add(new AwardItem
                {
                    Id = Guid.NewGuid(),
                    PurchaseItemId = item.PurchaseItemId,
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    TotalAmount = item.Quantity * unitPrice
                });
            }

            var awardAmount = awardItems.Sum(i => i.TotalAmount);
            if (awardAmount <= 0)
            {
                awardAmount = winningBid?.Amount ?? process.EstimatedBudget;
            }

            var template = await DocumentTemplateRules.EnsureActiveTemplate(
                _context,
                request.CompanyId,
                DocumentTemplateType.AwardAct,
                cancellationToken);

            var award = new Award
            {
                Id = Guid.NewGuid(),
                PurchaseProcessId = process.Id,
                SupplierId = supplier.Id,
                Amount = awardAmount,
                AdjudicatedById = request.AprobadorId,
                AdjudicatedAtUtc = DateTime.UtcNow,
                Observations = process.Evaluation.Observations,
                DocumentPath = string.Empty,
                DocumentTemplateId = template.Id,
                Items = awardItems
            };

            award.DocumentPath = _pdfGenerator.GenerateAwardAct(process, award, supplier, approver, bids, template);
            _context.Awards.Add(award);
            createdAwards.Add(award);
        }

        if (process.Items.Count > 0 && awardedItemIds.Count != process.Items.Count)
        {
            throw new InvalidOperationException("Todos los items del proceso deben quedar adjudicados.");
        }

        _context.Approvals.Add(new Approval
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            ApproverId = request.AprobadorId,
            Status = ApprovalStatus.Approved,
            Comments = $"Adjudicacion otorgada a {createdAwards.Count} proveedor(es) por un monto total de {createdAwards.Sum(a => a.Amount):C}.",
            CreatedAtUtc = DateTime.UtcNow
        });

        process.Status = PurchaseProcessStatus.Adjudicated;

        await _context.SaveChangesAsync(cancellationToken);

        return await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation).ThenInclude(e => e!.Evaluator)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.AdjudicatedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Where(p => p.Id == process.Id)
            .Select(p => PurchaseProcessMapping.ToDto(p))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static AwardSelectionInputDto BuildDefaultSelection(PurchaseProcess process, Guid supplierId, decimal fallbackAmount)
    {
        var estimatedTotal = process.Items.Sum(i => i.Quantity * (i.EstimatedUnitPrice ?? 0));

        return new AwardSelectionInputDto
        {
            SupplierId = supplierId,
            Items = process.Items.Select(item =>
            {
                var unitPrice = item.EstimatedUnitPrice ?? 0;
                if (estimatedTotal > 0 && fallbackAmount > 0)
                {
                    unitPrice = unitPrice * fallbackAmount / estimatedTotal;
                }

                return new AwardItemInputDto
                {
                    PurchaseItemId = item.Id,
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice
                };
            }).ToList()
        };
    }
}
