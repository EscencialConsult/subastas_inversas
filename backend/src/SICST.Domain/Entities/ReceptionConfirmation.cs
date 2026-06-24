namespace SICST.Domain.Entities;

public enum ReceptionConfirmationStatus
{
    Accepted = 0,
    AcceptedWithObservations = 1,
    Rejected = 2
}

public class ReceptionConfirmation
{
    public Guid Id { get; set; }

    public Guid PurchaseOrderId { get; set; }
    public PurchaseOrder PurchaseOrder { get; set; } = null!;

    public Guid ReceivedById { get; set; }
    public User ReceivedBy { get; set; } = null!;

    public ReceptionConfirmationStatus Status { get; set; } = ReceptionConfirmationStatus.Accepted;

    public DateTime ReceivedAtUtc { get; set; }

    public string Observations { get; set; } = string.Empty;

    public string DocumentPath { get; set; } = string.Empty;

    public List<ReceptionConfirmationItem> Items { get; set; } = [];
}

public class ReceptionConfirmationItem
{
    public Guid Id { get; set; }

    public Guid ReceptionConfirmationId { get; set; }
    public ReceptionConfirmation ReceptionConfirmation { get; set; } = null!;

    public Guid PurchaseItemId { get; set; }
    public PurchaseItem PurchaseItem { get; set; } = null!;

    public decimal QuantityReceived { get; set; }
}
