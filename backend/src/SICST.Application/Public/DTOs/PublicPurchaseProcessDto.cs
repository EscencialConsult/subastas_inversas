using SICST.Domain.Entities;

namespace SICST.Application.Public.DTOs;

public class PublicPurchaseProcessDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal EstimatedBudget { get; set; }
    public PurchaseProcessStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? PublishedAtUtc { get; set; }
    public bool HasAuction { get; set; }
}
