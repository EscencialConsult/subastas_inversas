using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record IssuePurchaseOrderCommand : IRequest<PurchaseOrderDto?>
{
    public Guid CompanyId { get; init; }
    public Guid ContractId { get; init; }
    public DateTime? ExpectedDeliveryDateUtc { get; init; }
    public string Observations { get; init; } = string.Empty;
}

public class IssuePurchaseOrderCommandHandler : IRequestHandler<IssuePurchaseOrderCommand, PurchaseOrderDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;
    private readonly IEmailSender _emailSender;

    public IssuePurchaseOrderCommandHandler(IApplicationDbContext context, IPdfGenerator pdfGenerator, IEmailSender emailSender)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
        _emailSender = emailSender;
    }

    public async Task<PurchaseOrderDto?> Handle(IssuePurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        var contract = await _context.Contracts
            .Include(c => c.Supplier)
            .Include(c => c.PurchaseProcess).ThenInclude(p => p.Items)
            .Include(c => c.PurchaseOrder)
            .FirstOrDefaultAsync(c => c.Id == request.ContractId && c.CompanyId == request.CompanyId, cancellationToken);

        if (contract == null)
        {
            return null;
        }

        if (contract.Status != ContractStatus.Active)
        {
            throw new InvalidOperationException("Solo se puede emitir orden de compra para contratos activos.");
        }

        if (contract.PurchaseOrder != null)
        {
            throw new InvalidOperationException("Este contrato ya tiene una orden de compra emitida.");
        }

        var count = await _context.PurchaseOrders.CountAsync(o => o.CompanyId == request.CompanyId, cancellationToken);
        var template = await DocumentTemplateRules.EnsureActiveTemplate(
            _context,
            request.CompanyId,
            DocumentTemplateType.PurchaseOrder,
            cancellationToken);

        var order = new PurchaseOrder
        {
            Id = Guid.NewGuid(),
            CompanyId = contract.CompanyId,
            PurchaseProcessId = contract.PurchaseProcessId,
            ContractId = contract.Id,
            SupplierId = contract.SupplierId,
            Number = $"OC-{DateTime.UtcNow:yyyy}-{count + 1:0000}",
            Amount = contract.Amount,
            Status = PurchaseOrderStatus.Issued,
            IssuedAtUtc = DateTime.UtcNow,
            ExpectedDeliveryDateUtc = request.ExpectedDeliveryDateUtc,
            Observations = request.Observations.Trim(),
            DocumentPath = string.Empty,
            DocumentTemplateId = template.Id
        };

        order.DocumentPath = _pdfGenerator.GeneratePurchaseOrder(contract.PurchaseProcess, order, contract.Supplier, template);
        _context.PurchaseOrders.Add(order);
        contract.PurchaseProcess.Status = PurchaseProcessStatus.PurchaseOrderIssued;

        await _context.SaveChangesAsync(cancellationToken);

        var deliveryDateText = request.ExpectedDeliveryDateUtc.HasValue
            ? request.ExpectedDeliveryDateUtc.Value.ToLocalTime().ToString("dd/MM/yyyy")
            : "No especificada";

        var emailBody = $@"
Estimado/a {contract.Supplier.BusinessName},

Se ha emitido la Orden de Compra N° {order.Number} correspondiente al proceso {contract.PurchaseProcess.Code} - {contract.PurchaseProcess.Title}.

Detalle de la Orden de Compra:
  - Numero: {order.Number}
  - Monto: {order.Amount:C}
  - Fecha de emision: {order.IssuedAtUtc.ToLocalTime():dd/MM/yyyy HH:mm}
  - Fecha de entrega prevista: {deliveryDateText}

El plazo de entrega comienza a regir a partir de la recepcion de la presente notificacion.

Por favor, coordine la entrega de los bienes/servicios segun lo estipulado en el contrato.

Saludos cordiales,
Sistema de Compras Publicas y Subastas (SICST)";

        await _emailSender.SendAsync(
            contract.Supplier.Email,
            $"Orden de Compra N° {order.Number} - {contract.PurchaseProcess.Code}",
            emailBody,
            cancellationToken);

        order.Supplier = contract.Supplier;
        order.Receptions = [];
        return PurchaseProcessMapping.ToPurchaseOrderDto(order);
    }
}
