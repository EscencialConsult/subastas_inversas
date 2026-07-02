using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record ConfirmReceptionCommand : IRequest<ReceptionConfirmationDto?>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseOrderId { get; init; }
    public Guid ReceivedById { get; init; }
    public ReceptionConfirmationStatus Status { get; init; } = ReceptionConfirmationStatus.Accepted;
    public string Observations { get; init; } = string.Empty;
    public List<ReceptionConfirmationItemInputDto> Items { get; init; } = [];
}

public class ConfirmReceptionCommandHandler : IRequestHandler<ConfirmReceptionCommand, ReceptionConfirmationDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;

    public ConfirmReceptionCommandHandler(IApplicationDbContext context, IPdfGenerator pdfGenerator)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
    }

    public async Task<ReceptionConfirmationDto?> Handle(ConfirmReceptionCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.PurchaseProcess).ThenInclude(p => p.Items)
            .Include(o => o.PurchaseProcess).ThenInclude(p => p.PurchaseOrders)
            .Include(o => o.Contract).ThenInclude(c => c.Award).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Include(o => o.Receptions).ThenInclude(r => r.Items)
            .FirstOrDefaultAsync(o => o.Id == request.PurchaseOrderId && o.CompanyId == request.CompanyId, cancellationToken);

        if (order == null)
        {
            return null;
        }

        if (order.Status == PurchaseOrderStatus.Cancelled || order.Status == PurchaseOrderStatus.Received)
        {
            throw new InvalidOperationException("La orden de compra no admite nuevas recepciones.");
        }

        if (request.Items.Count == 0)
        {
            throw new InvalidOperationException("La recepcion debe incluir al menos un item.");
        }

        var receiver = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.ReceivedById, cancellationToken);
        if (receiver == null)
        {
            throw new InvalidOperationException("Usuario receptor no encontrado.");
        }

        var processItems = order.PurchaseProcess.Items.ToDictionary(i => i.Id);
        var receivableItems = order.Contract.Award.Items.Count > 0
            ? order.Contract.Award.Items.ToDictionary(i => i.PurchaseItemId, i => i.Quantity)
            : processItems.ToDictionary(i => i.Key, i => i.Value.Quantity);
        var groupedItems = request.Items
            .GroupBy(i => i.PurchaseItemId)
            .Select(g => new ReceptionConfirmationItemInputDto
            {
                PurchaseItemId = g.Key,
                QuantityReceived = g.Sum(i => i.QuantityReceived)
            })
            .ToList();

        foreach (var item in groupedItems)
        {
            if (!processItems.TryGetValue(item.PurchaseItemId, out var purchaseItem) ||
                !receivableItems.TryGetValue(item.PurchaseItemId, out var receivableQuantity))
            {
                throw new InvalidOperationException("La recepcion contiene items que no pertenecen a esta orden de compra.");
            }

            if (item.QuantityReceived <= 0)
            {
                throw new InvalidOperationException("Las cantidades recibidas deben ser mayores a cero.");
            }

            var alreadyReceived = order.Receptions
                .Where(r => r.Status != ReceptionConfirmationStatus.Rejected)
                .SelectMany(r => r.Items)
                .Where(i => i.PurchaseItemId == item.PurchaseItemId)
                .Sum(i => i.QuantityReceived);

            if (alreadyReceived + item.QuantityReceived > receivableQuantity)
            {
                throw new InvalidOperationException($"La cantidad recibida para '{purchaseItem.Description}' supera lo adjudicado en esta orden.");
            }
        }

        var reception = new ReceptionConfirmation
        {
            Id = Guid.NewGuid(),
            PurchaseOrderId = order.Id,
            ReceivedById = request.ReceivedById,
            Status = request.Status,
            ReceivedAtUtc = DateTime.UtcNow,
            Observations = request.Observations.Trim(),
            DocumentPath = string.Empty,
            Items = groupedItems.Select(item => new ReceptionConfirmationItem
            {
                Id = Guid.NewGuid(),
                PurchaseItemId = item.PurchaseItemId,
                QuantityReceived = item.QuantityReceived
            }).ToList()
        };

        var totalsAfterReception = receivableItems.ToDictionary(
            item => item.Key,
            item => order.Receptions
                .Where(r => r.Status != ReceptionConfirmationStatus.Rejected)
                .SelectMany(r => r.Items)
                .Where(i => i.PurchaseItemId == item.Key)
                .Sum(i => i.QuantityReceived));

        if (request.Status != ReceptionConfirmationStatus.Rejected)
        {
            foreach (var item in reception.Items)
            {
                totalsAfterReception[item.PurchaseItemId] += item.QuantityReceived;
            }
        }

        var fullyReceived = receivableItems.All(item => totalsAfterReception[item.Key] >= item.Value);
        if (request.Status == ReceptionConfirmationStatus.Rejected)
        {
            order.Status = order.Receptions.Any(r => r.Status != ReceptionConfirmationStatus.Rejected)
                ? PurchaseOrderStatus.PartiallyReceived
                : PurchaseOrderStatus.Issued;
        }
        else
        {
            order.Status = fullyReceived ? PurchaseOrderStatus.Received : PurchaseOrderStatus.PartiallyReceived;
            order.PurchaseProcess.Status = fullyReceived &&
                order.PurchaseProcess.PurchaseOrders.All(o => o.Id == order.Id || o.Status == PurchaseOrderStatus.Received)
                    ? PurchaseProcessStatus.Received
                    : PurchaseProcessStatus.PurchaseOrderIssued;
        }

        _context.ReceptionConfirmations.Add(reception);
        await _context.SaveChangesAsync(cancellationToken);

        reception.PurchaseOrder = order;
        reception.ReceivedBy = receiver;
        foreach (var item in reception.Items)
        {
            item.PurchaseItem = processItems[item.PurchaseItemId];
        }
        reception.DocumentPath = _pdfGenerator.GenerateReceptionConfirmation(order, reception);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToReceptionDto(reception);
    }
}
