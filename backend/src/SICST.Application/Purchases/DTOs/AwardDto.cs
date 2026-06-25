using System;

namespace SICST.Application.Purchases.DTOs;

public class AwardDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid SupplierId { get; set; }
    public string Proveedor { get; set; } = string.Empty;
    public decimal Monto { get; set; }
    public Guid AprobadorId { get; set; }
    public string AprobadorName { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
    public string ActaUrl { get; set; } = string.Empty;
    public Guid? DocumentTemplateId { get; set; }
    public List<AwardItemDto> Items { get; set; } = [];
}

public class AwardItemDto
{
    public Guid Id { get; set; }
    public Guid PurchaseItemId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalAmount { get; set; }
}
