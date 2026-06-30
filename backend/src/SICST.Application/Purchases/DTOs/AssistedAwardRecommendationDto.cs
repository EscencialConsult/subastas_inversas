namespace SICST.Application.Purchases.DTOs;

public class AssistedAwardRecommendationDto
{
    public Guid PurchaseProcessId { get; set; }
    public Guid? RecommendedSupplierId { get; set; }
    public string RecommendedSupplierName { get; set; } = string.Empty;
    public decimal RecommendedAmount { get; set; }
    public decimal SavingsAmount { get; set; }
    public decimal SavingsPercentage { get; set; }
    public decimal? TechnicalScore { get; set; }
    public bool HasRecommendation { get; set; }
    public string Summary { get; set; } = string.Empty;
    public List<AssistedAwardRiskDto> Risks { get; set; } = [];
    public List<AssistedAwardCandidateDto> Candidates { get; set; } = [];
}

public class AssistedAwardRiskDto
{
    public string Code { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
}

public class AssistedAwardCandidateDto
{
    public int Position { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal SavingsAmount { get; set; }
    public decimal SavingsPercentage { get; set; }
    public decimal? TechnicalScore { get; set; }
    public bool IsExcluded { get; set; }
    public string? ExcludedReason { get; set; }
    public bool IsPab { get; set; }
    public int BidCount { get; set; }
}
