using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.DTOs;

public class PurchaseOrderDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid ContractId { get; set; }
    public Guid SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Number { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public PurchaseOrderStatus Status { get; set; }
    public DateTime IssuedAtUtc { get; set; }
    public DateTime? ExpectedDeliveryDateUtc { get; set; }
    public string Observations { get; set; } = string.Empty;
    public string DocumentUrl { get; set; } = string.Empty;
    public Guid? DocumentTemplateId { get; set; }
    public List<ReceptionConfirmationDto> Receptions { get; set; } = [];
}
