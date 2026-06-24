using SICST.Domain.Entities;

namespace SICST.Application.Purchases.DTOs;

public class ReceptionConfirmationDto
{
    public Guid Id { get; set; }
    public Guid PurchaseOrderId { get; set; }
    public Guid ReceivedById { get; set; }
    public string ReceivedByName { get; set; } = string.Empty;
    public ReceptionConfirmationStatus Status { get; set; }
    public DateTime ReceivedAtUtc { get; set; }
    public string Observations { get; set; } = string.Empty;
    public string DocumentUrl { get; set; } = string.Empty;
    public List<ReceptionConfirmationItemDto> Items { get; set; } = [];
}

public class ReceptionConfirmationItemDto
{
    public Guid Id { get; set; }
    public Guid PurchaseItemId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal OrderedQuantity { get; set; }
    public decimal QuantityReceived { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public class ReceptionConfirmationItemInputDto
{
    public Guid PurchaseItemId { get; set; }
    public decimal QuantityReceived { get; set; }
}
