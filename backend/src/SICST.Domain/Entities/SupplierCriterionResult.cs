namespace SICST.Domain.Entities;

public class SupplierCriterionResult
{
    public Guid Id { get; set; }
    public Guid SupplierEvaluationId { get; set; }
    public SupplierEvaluation SupplierEvaluation { get; set; } = null!;
    public Guid EvaluationCriterionId { get; set; }
    public EvaluationCriterion EvaluationCriterion { get; set; } = null!;
    public decimal? Score { get; set; }
    public bool Passed { get; set; }
    public string? Notes { get; set; }
}
