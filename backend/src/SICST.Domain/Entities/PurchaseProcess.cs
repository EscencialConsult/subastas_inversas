namespace SICST.Domain.Entities;

public enum PurchaseProcessStatus
{
    Draft = 0,
    PendingApproval = 1,
    Approved = 2,
    Rejected = 3,
    InAuction = 4,
    Evaluation = 5,
    Adjudicated = 6,
    Closed = 7,
    Contracted = 8,
    PurchaseOrderIssued = 9,
    Received = 10,
    Deserted = 11,
    SuspendedByChallenge = 12
}

public class PurchaseProcess
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;

    public Guid BuyerId { get; set; }

    public User Buyer { get; set; } = null!;

    public Guid? ContractingModeId { get; set; }

    public ContractingMode? ContractingMode { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal EstimatedBudget { get; set; }

    public PurchaseProcessStatus Status { get; set; } = PurchaseProcessStatus.Draft;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? PublishedAtUtc { get; set; }

    public DateTime? ClosedAtUtc { get; set; }

    public string? RejectionReason { get; set; }

    public string? SpecificationsHash { get; set; }

    // Navigation properties for Evaluation Act (HU-052)
    public bool IsEvaluationActSigned { get; set; }
    public string? EvaluationActHash { get; set; }
    public string? EvaluationActSignature { get; set; }
    public DateTime? EvaluationActSignedAtUtc { get; set; }
    public Guid? EvaluationActSignedById { get; set; }
    public User? EvaluationActSignedBy { get; set; }

    // Navigation properties for Sprint 7
    public Evaluation? Evaluation { get; set; }
    public List<Award> Awards { get; set; } = [];

    // Navigation properties for Sprint 8
    public List<Contract> Contracts { get; set; } = [];
    public List<PurchaseOrder> PurchaseOrders { get; set; } = [];

    public List<PurchaseItem> Items { get; set; } = [];

    // Navigation properties for Sprint 9 — Criterios de evaluación
    public List<EvaluationCriterion> EvaluationCriteria { get; set; } = [];
    public List<SupplierEvaluation> SupplierEvaluations { get; set; } = [];
}
