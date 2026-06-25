using System;

namespace SICST.Domain.Entities;

public class Award
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public decimal Amount { get; set; }

    public Guid AdjudicatedById { get; set; }
    public User AdjudicatedBy { get; set; } = null!;

    public DateTime AdjudicatedAtUtc { get; set; }

    public string Observations { get; set; } = string.Empty;

    public string DocumentPath { get; set; } = string.Empty;

    public Guid? DocumentTemplateId { get; set; }
    public DocumentTemplate? DocumentTemplate { get; set; }

    public Contract? Contract { get; set; }

    public List<AwardItem> Items { get; set; } = [];
}

public class AwardItem
{
    public Guid Id { get; set; }

    public Guid AwardId { get; set; }
    public Award Award { get; set; } = null!;

    public Guid PurchaseItemId { get; set; }
    public PurchaseItem PurchaseItem { get; set; } = null!;

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalAmount { get; set; }
}
