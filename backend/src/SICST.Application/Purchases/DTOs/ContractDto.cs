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
    public Guid? SignedByOperatorId { get; set; }
    public string? SignedByOperatorName { get; set; }
    public string? SignatureHash { get; set; }
    public string? SignatureFormat { get; set; }
    public string? SignatureAlgorithm { get; set; }
    public string DocumentUrl { get; set; } = string.Empty;
    public Guid? DocumentTemplateId { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal TotalPenalties { get; set; }
    public decimal OutstandingAmount { get; set; }
    public List<ContractPaymentDto> Payments { get; set; } = [];
}

public class ContractPaymentDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid ContractId { get; set; }
    public Guid RegisteredById { get; set; }
    public string RegisteredByName { get; set; } = string.Empty;
    public DateTime PaymentDateUtc { get; set; }
    public decimal PaymentAmount { get; set; }
    public decimal PenaltyAmount { get; set; }
    public int DelayDays { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
