namespace SICST.Domain.Entities;

public class CompanySupplier
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public Guid SupplierId { get; set; }

    public Supplier Supplier { get; set; } = null!;

    public DateTime LinkedAtUtc { get; set; }
}
