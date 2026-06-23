namespace SICST.Domain.Entities;

public enum PurchaseProcessStatus
{
    Draft,
    Published,
    Closed
}

public class PurchaseProcess
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public Guid BuyerId { get; set; }

    public User Buyer { get; set; } = null!;

    public Guid? ContractingModeId { get; set; }

    public ContractingMode? ContractingMode { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal EstimatedBudget { get; set; }

    public PurchaseProcessStatus Status { get; set; } = PurchaseProcessStatus.Draft;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? PublishedAtUtc { get; set; }

    public DateTime? ClosedAtUtc { get; set; }

    public List<PurchaseItem> Items { get; set; } = [];
}
