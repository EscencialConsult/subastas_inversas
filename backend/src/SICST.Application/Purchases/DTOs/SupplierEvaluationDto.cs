namespace SICST.Application.Purchases.DTOs;

public class SupplierEvaluationDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal? TotalWeightedScore { get; set; }
    public bool IsExcluded { get; set; }
    public string? ExcludedReason { get; set; }
    public Guid EvaluatedById { get; set; }
    public string EvaluatedByName { get; set; } = string.Empty;
    public DateTime EvaluatedAtUtc { get; set; }
    public List<SupplierCriterionResultDto> CriterionResults { get; set; } = [];
}

public class SupplierCriterionResultDto
{
    public Guid Id { get; set; }
    public Guid EvaluationCriterionId { get; set; }
    public string CriterionName { get; set; } = string.Empty;
    public string CriterionType { get; set; } = string.Empty;
    public decimal? Score { get; set; }
    public bool Passed { get; set; }
    public string? Notes { get; set; }
}

public class SaveSupplierEvaluationInputDto
{
    public Guid SupplierId { get; set; }
    public List<SaveCriterionResultInputDto> Results { get; set; } = [];
}

public class SaveCriterionResultInputDto
{
    public Guid EvaluationCriterionId { get; set; }
    public decimal? Score { get; set; }
    public bool Passed { get; set; }
    public string? Notes { get; set; }
}

public class EvaluationResultsDto
{
    public Guid PurchaseProcessId { get; set; }
    public List<EvaluationCriterionDto> Criteria { get; set; } = [];
    public List<SupplierEvaluationDto> SupplierEvaluations { get; set; } = [];
}
