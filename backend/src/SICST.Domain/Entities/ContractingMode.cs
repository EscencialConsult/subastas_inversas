namespace SICST.Domain.Entities;

public class ContractingMode
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal MinAmount { get; set; }

    public decimal? MaxAmount { get; set; }

    public bool RequiresAuction { get; set; } = true;

    public bool Active { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }
}
