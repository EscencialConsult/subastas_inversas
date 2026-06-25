using System;

namespace SICST.Domain.Entities;

public enum ApprovalStatus
{
    Approved,
    Rejected
}

public class Approval
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid ApproverId { get; set; }
    public User Approver { get; set; } = null!;

    public Guid? ApprovalWorkflowLevelId { get; set; }
    public ApprovalWorkflowLevel? ApprovalWorkflowLevel { get; set; }

    public ApprovalStatus Status { get; set; }

    public string Comments { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
