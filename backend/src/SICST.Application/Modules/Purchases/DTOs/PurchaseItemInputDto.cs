namespace SICST.Application.Modules.Purchases.DTOs;

public class PurchaseItemInputDto
{
    public string Description { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal? EstimatedUnitPrice { get; set; }
}
