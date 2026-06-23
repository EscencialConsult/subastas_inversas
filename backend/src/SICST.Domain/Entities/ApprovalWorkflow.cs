namespace SICST.Domain.Entities;

public class ApprovalWorkflow
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public decimal? MinAmount { get; set; }

    public decimal? MaxAmount { get; set; }

    public UserRole RequiredRole { get; set; } = UserRole.Autoridad;

    public int RequiredApprovals { get; set; } = 1;

    public bool Active { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }
}
