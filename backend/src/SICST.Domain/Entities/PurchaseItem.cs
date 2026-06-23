namespace SICST.Domain.Entities;

public class PurchaseItem
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }

    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public string Description { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public string Unit { get; set; } = string.Empty;

    public decimal? EstimatedUnitPrice { get; set; }
}
