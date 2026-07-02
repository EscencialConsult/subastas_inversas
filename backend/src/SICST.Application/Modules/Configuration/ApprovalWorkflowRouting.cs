using SICST.Domain.Entities;

namespace SICST.Application.Modules.Configuration;

public static class ApprovalWorkflowRouting
{
    public static List<ApprovalWorkflowLevel> GetRequiredLevels(ApprovalWorkflow workflow, decimal amount)
    {
        return workflow.Levels
            .Where(level => level.AmountThreshold <= amount)
            .OrderBy(level => level.LevelOrder)
            .ToList();
    }
}
