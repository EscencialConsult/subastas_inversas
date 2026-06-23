using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.DTOs;

public class SupplierDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Cuit { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public string Locality { get; set; } = string.Empty;
    public SupplierStatus Status { get; set; }
    public bool ArcaVerified { get; set; }
}
