using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.DTOs;

public class CompanySupplierDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid SupplierId { get; set; }
    public CompanySupplierStatus Status { get; set; }
    public string? WarningMessage { get; set; }
    public bool StrictPolicyApplied { get; set; }
    public DateTime LinkedAtUtc { get; set; }
    public DateTime EvaluatedAtUtc { get; set; }
}
