using SICST.Domain.Entities;

namespace SICST.Application.Configuration.DTOs;

public class ApprovalWorkflowDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? MinAmount { get; set; }
    public decimal? MaxAmount { get; set; }
    public UserRole RequiredRole { get; set; }
    public int RequiredApprovals { get; set; }
    public bool Active { get; set; }
    public List<ApprovalWorkflowLevelDto> Levels { get; set; } = [];
}

public class ApprovalWorkflowLevelDto
{
    public Guid Id { get; set; }
    public int LevelOrder { get; set; }
    public UserRole RequiredRole { get; set; }
    public decimal AmountThreshold { get; set; }
}
