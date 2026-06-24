using System;

namespace SICST.Domain.Entities;

public class Evaluation
{
    public Guid Id { get; set; }

    public Guid PurchaseProcessId { get; set; }
    public PurchaseProcess PurchaseProcess { get; set; } = null!;

    public Guid EvaluatorId { get; set; }
    public User Evaluator { get; set; } = null!;

    public string RecommendedSupplier { get; set; } = string.Empty;
    public string Observations { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
}
