using SICST.Domain.Entities;

namespace SICST.Application.Purchases.DTOs;

public class PurchaseProcessDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BuyerId { get; set; }
    public Guid? ContractingModeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal EstimatedBudget { get; set; }
    public PurchaseProcessStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public string? RejectionReason { get; set; }
    public bool HasAuction { get; set; }
    public EvaluationDto? Evaluation { get; set; }
    public AwardDto? Award { get; set; }
    public List<AwardDto> Awards { get; set; } = [];
    public ContractDto? Contract { get; set; }
    public List<ContractDto> Contracts { get; set; } = [];
    public PurchaseOrderDto? PurchaseOrder { get; set; }
    public List<PurchaseOrderDto> PurchaseOrders { get; set; } = [];
    public List<PurchaseItemDto> Items { get; set; } = [];
    public string? SpecificationsHash { get; set; }
}
