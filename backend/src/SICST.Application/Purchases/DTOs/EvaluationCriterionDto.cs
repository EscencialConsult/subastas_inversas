namespace SICST.Application.Purchases.DTOs;

public class EvaluationCriterionDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public int SortOrder { get; set; }
    public Guid CreatedById { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class SaveEvaluationCriteriaItemDto
{
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public int SortOrder { get; set; }
}
