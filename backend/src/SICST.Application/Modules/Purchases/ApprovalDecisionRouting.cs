using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases;

public record ApprovalDecisionRoute(
    ApprovalWorkflowLevel? NextLevel,
    int ApprovedLevelCount,
    int RequiredLevelCount);

public static class ApprovalDecisionRouting
{
    public static async Task<ApprovalDecisionRoute> ResolveNextLevel(
        IApplicationDbContext context,
        Guid companyId,
        Guid purchaseProcessId,
        decimal amount,
        CancellationToken cancellationToken)
    {
        var workflow = await ApprovalWorkflowRules.FindWorkflowForAmount(
            context,
            companyId,
            amount,
            cancellationToken);

        if (workflow == null)
        {
            return new ApprovalDecisionRoute(null, 0, 0);
        }

        var levels = ApprovalWorkflowRouting.GetRequiredLevels(workflow, amount);
        if (levels.Count == 0)
        {
            return new ApprovalDecisionRoute(null, 0, 0);
        }

        var levelIds = levels.Select(level => level.Id).ToList();
        var approvedLevelIds = await context.Approvals
            .Where(approval => approval.PurchaseProcessId == purchaseProcessId &&
                approval.Status == ApprovalStatus.Approved &&
                approval.ApprovalWorkflowLevelId.HasValue &&
                levelIds.Contains(approval.ApprovalWorkflowLevelId.Value))
            .Select(approval => approval.ApprovalWorkflowLevelId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var nextLevel = levels.FirstOrDefault(level => !approvedLevelIds.Contains(level.Id));
        return new ApprovalDecisionRoute(nextLevel, approvedLevelIds.Count, levels.Count);
    }

    public static void EnsureApproverCanAct(User approver, ApprovalWorkflowLevel? level)
    {
        if (level == null)
        {
            if (approver.Role != UserRole.Autoridad)
            {
                throw new InvalidOperationException("La decision requiere rol Autoridad.");
            }

            return;
        }

        if (approver.Role != level.RequiredRole)
        {
            throw new InvalidOperationException($"El nivel {level.LevelOrder} requiere rol {level.RequiredRole}.");
        }
    }
}
