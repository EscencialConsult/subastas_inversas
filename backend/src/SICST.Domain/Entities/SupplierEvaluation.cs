namespace SICST.Domain.Entities;

public class SupplierEvaluation
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;
    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public decimal? TotalWeightedScore { get; set; }
    public bool IsExcluded { get; set; }
    public string? ExcludedReason { get; set; }
    public Guid EvaluatedById { get; set; }
    public User EvaluatedBy { get; set; } = null!;
    public DateTime EvaluatedAtUtc { get; set; }
    public List<SupplierCriterionResult> CriterionResults { get; set; } = [];
}
