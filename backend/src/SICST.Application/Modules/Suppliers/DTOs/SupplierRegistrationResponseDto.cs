namespace SICST.Application.Modules.Suppliers.DTOs;

public class SupplierRegistrationResponseDto
{
    public Guid UserId { get; set; }
    public Guid SupplierId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
