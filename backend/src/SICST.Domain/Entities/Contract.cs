namespace SICST.Domain.Entities;

public enum ContractStatus
{
    Draft = 0,
    Active = 1,
    Completed = 2,
    Cancelled = 3
}

public class Contract
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid AwardId { get; set; }
    public Award Award { get; set; } = null!;

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string Number { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateTime StartDateUtc { get; set; }

    public DateTime? EndDateUtc { get; set; }

    public ContractStatus Status { get; set; } = ContractStatus.Active;

    public string Terms { get; set; } = string.Empty;

    public string DocumentPath { get; set; } = string.Empty;

    public Guid? DocumentTemplateId { get; set; }
    public DocumentTemplate? DocumentTemplate { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? SignedAtUtc { get; set; }

    public PurchaseOrder? PurchaseOrder { get; set; }
}
