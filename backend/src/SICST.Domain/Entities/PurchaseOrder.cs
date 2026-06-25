namespace SICST.Domain.Entities;

public enum PurchaseOrderStatus
{
    Issued = 0,
    PartiallyReceived = 1,
    Received = 2,
    Cancelled = 3
}

public class PurchaseOrder
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid ContractId { get; set; }
    public Contract Contract { get; set; } = null!;

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string Number { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Issued;

    public DateTime IssuedAtUtc { get; set; }

    public DateTime? ExpectedDeliveryDateUtc { get; set; }

    public string Observations { get; set; } = string.Empty;

    public string DocumentPath { get; set; } = string.Empty;

    public Guid? DocumentTemplateId { get; set; }
    public DocumentTemplate? DocumentTemplate { get; set; }

    public List<ReceptionConfirmation> Receptions { get; set; } = [];
}
