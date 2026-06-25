namespace SICST.Domain.Entities;

public enum CompanySupplierStatus
{
    Enabled,
    EnabledWithWarning,
    Blocked
}

public class CompanySupplier
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public DateTime LinkedAtUtc { get; set; }

    public CompanySupplierStatus Status { get; set; }

    public string? WarningMessage { get; set; }

    public DateTime EvaluatedAtUtc { get; set; }
}
