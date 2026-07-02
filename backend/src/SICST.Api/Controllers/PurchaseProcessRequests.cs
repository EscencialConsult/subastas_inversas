using SICST.Application.Modules.Purchases.DTOs;
using SICST.Application.Modules.Purchases.Commands;

namespace SICST.Api.Controllers;

public record ApproveRequest(Guid ApproverId);
public record RejectRequest(Guid ApproverId, string Motivo);
public record ReturnRequest(Guid ApproverId, string Motivo);
public record ExceptionDecisionRequest(Guid OperatorId, string Fundamento);
public record EvaluateRequest(Guid EvaluadorId, string RecomendadoProveedor, string Observaciones);
public record AdjudicateRequest(Guid AprobadorId, List<AwardSelectionInputDto>? Awards = null);
public record SaveEvaluationCriteriaRequest(Guid UserId, List<SaveEvaluationCriteriaItemDto> Criteria);
public record EvaluateSuppliersRequest(Guid EvaluatorId, List<SaveSupplierEvaluationInputDto> SupplierEvaluations);
public record QualifySupplierRequest(Guid EvaluatorId, string QualificationStatus, string? Notes);
public record SignEvaluationActRequest(Guid EvaluatorId, string SignatureImageBase64);
