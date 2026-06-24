using SICST.Domain.Entities;

namespace SICST.Application.Purchases.DTOs;

public class ContractDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid AwardId { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; }
    public ContractStatus Status { get; set; }
    public string Terms { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? SignedAtUtc { get; set; }
    public string DocumentUrl { get; set; } = string.Empty;
}
