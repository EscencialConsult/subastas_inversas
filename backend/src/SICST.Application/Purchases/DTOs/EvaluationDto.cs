using System;

namespace SICST.Application.Purchases.DTOs;

public class EvaluationDto
{
    public Guid Id { get; set; }
    public Guid PurchaseProcessId { get; set; }
    public Guid EvaluatorId { get; set; }
    public string EvaluatorName { get; set; } = string.Empty;
    public string RecomendadoProveedor { get; set; } = string.Empty;
    public string Observaciones { get; set; } = string.Empty;
    public string Fecha { get; set; } = string.Empty;
}
