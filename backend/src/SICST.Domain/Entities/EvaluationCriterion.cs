namespace SICST.Domain.Entities;

public enum CriterionType
{
    Exclusionary = 0,
    Weighted = 1
}

public class EvaluationCriterion
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CriterionType Type { get; set; }
    public decimal Weight { get; set; }
    public int SortOrder { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
