using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Models;
using SICST.Application.Common.Security;
using SICST.Application.Modules.Purchases.Commands;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Application.Modules.Purchases.Queries;
using SICST.Domain.Entities;

namespace SICST.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/companies/{companyId:guid}/purchase-processes")]
public class EvaluationController : ControllerBase
{
    private readonly ISender _sender;

    public EvaluationController(ISender sender)
    {
        _sender = sender;
    }

    [HttpGet("evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<PagedResult<PurchaseProcessDto>>> GetForEvaluation(
        Guid companyId,
        [FromQuery] string? search,
        [FromQuery] PurchaseProcessStatus? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50)
    {
        return Ok(await _sender.Send(new GetPurchaseProcessesQuery(companyId, search, status, pageNumber, pageSize)));
    }

    [HttpGet("{id:guid}/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<PurchaseProcessDto>> GetEvaluationById(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        return process == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(process);
    }

    [HttpGet("{id:guid}/suppliers")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<List<QualificationSupplierDto>>> GetSuppliers(Guid companyId, Guid id)
    {
        return Ok(await _sender.Send(new GetProcessSuppliersQuery(companyId, id)));
    }

    [HttpPost("{id:guid}/invitations/{invId:guid}/qualify")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<QualificationSupplierDto>> QualifySupplier(
        Guid companyId,
        Guid id,
        Guid invId,
        [FromBody] QualifySupplierRequest request)
    {
        if (!Enum.TryParse<QualificationStatus>(request.QualificationStatus, out var status))
        {
            return BadRequest(new { message = "Estado de calificacion invalido. Use: Approved, Observed o Rejected." });
        }

        return Ok(await _sender.Send(new QualifySupplierCommand
        {
            CompanyId = companyId,
            PurchaseProcessId = id,
            InvitationId = invId,
            EvaluatorId = request.EvaluatorId,
            QualificationStatus = status,
            Notes = request.Notes
        }));
    }

    [HttpGet("{id:guid}/evaluation-criteria")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<List<EvaluationCriterionDto>>> GetEvaluationCriteria(Guid companyId, Guid id)
    {
        return Ok(await _sender.Send(new GetEvaluationCriteriaQuery(companyId, id)));
    }

    [HttpGet("{id:guid}/evaluation-criteria/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<List<EvaluationCriterionDto>>> GetEvaluationCriteriaForEvaluator(Guid companyId, Guid id)
    {
        return Ok(await _sender.Send(new GetEvaluationCriteriaQuery(companyId, id)));
    }

    [HttpPut("{id:guid}/evaluation-criteria")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<List<EvaluationCriterionDto>>> SaveEvaluationCriteria(
        Guid companyId,
        Guid id,
        [FromBody] SaveEvaluationCriteriaRequest request)
    {
        return Ok(await _sender.Send(new SaveEvaluationCriteriaCommand(companyId, id, request.UserId, request.Criteria)));
    }

    [HttpPut("{id:guid}/evaluation-criteria/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<List<EvaluationCriterionDto>>> SaveEvaluationCriteriaForEvaluator(
        Guid companyId,
        Guid id,
        [FromBody] SaveEvaluationCriteriaRequest request)
    {
        return Ok(await _sender.Send(new SaveEvaluationCriteriaCommand(companyId, id, request.UserId, request.Criteria)));
    }

    [HttpPost("{id:guid}/evaluate-suppliers")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<EvaluationResultsDto>> EvaluateSuppliers(
        Guid companyId,
        Guid id,
        [FromBody] EvaluateSuppliersRequest request)
    {
        return Ok(await _sender.Send(new SaveSupplierEvaluationsCommand(
            companyId,
            id,
            request.EvaluatorId,
            request.SupplierEvaluations)));
    }

    [HttpGet("{id:guid}/evaluation-results")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<EvaluationResultsDto>> GetEvaluationResults(Guid companyId, Guid id)
    {
        var results = await _sender.Send(new GetEvaluationResultsQuery(companyId, id));
        return results == null ? NotFound(new { message = "No se encontraron resultados de evaluacion para este proceso." }) : Ok(results);
    }

    [HttpGet("{id:guid}/evaluation-results/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<EvaluationResultsDto>> GetEvaluationResultsForEvaluator(Guid companyId, Guid id)
    {
        var results = await _sender.Send(new GetEvaluationResultsQuery(companyId, id));
        return results == null ? NotFound(new { message = "No se encontraron resultados de evaluacion para este proceso." }) : Ok(results);
    }

    [HttpGet("{id:guid}/evaluation-results/audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<EvaluationResultsDto>> GetEvaluationResultsForAudit(Guid companyId, Guid id)
    {
        var results = await _sender.Send(new GetEvaluationResultsQuery(companyId, id));
        return results == null ? NotFound(new { message = "No se encontraron resultados de evaluacion para este proceso." }) : Ok(results);
    }

    [HttpGet("{id:guid}/award-recommendation")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<AssistedAwardRecommendationDto>> GetAwardRecommendation(Guid companyId, Guid id)
    {
        var recommendation = await _sender.Send(new GetAssistedAwardRecommendationQuery(companyId, id));
        return recommendation == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(recommendation);
    }

    [HttpGet("{id:guid}/award-recommendation/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<AssistedAwardRecommendationDto>> GetAwardRecommendationForEvaluator(Guid companyId, Guid id)
    {
        var recommendation = await _sender.Send(new GetAssistedAwardRecommendationQuery(companyId, id));
        return recommendation == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(recommendation);
    }

    [HttpGet("{id:guid}/award-recommendation/audit")]
    [Authorize(Policy = PermissionCodes.AuditRead)]
    public async Task<ActionResult<AssistedAwardRecommendationDto>> GetAwardRecommendationForAudit(Guid companyId, Guid id)
    {
        var recommendation = await _sender.Send(new GetAssistedAwardRecommendationQuery(companyId, id));
        return recommendation == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(recommendation);
    }

    [HttpPost("{id:guid}/evaluate")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Evaluate(Guid companyId, Guid id, [FromBody] EvaluateRequest request)
    {
        var process = await _sender.Send(new RegisterEvaluationCommand(
            companyId,
            id,
            request.EvaluadorId,
            request.RecomendadoProveedor,
            request.Observaciones));

        return process == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(process);
    }

    [HttpPost("{id:guid}/adjudicate")]
    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    public async Task<ActionResult<PurchaseProcessDto>> Adjudicate(Guid companyId, Guid id, [FromBody] AdjudicateRequest request)
    {
        var process = await _sender.Send(new AdjudicateProcessCommand(companyId, id, request.AprobadorId, request.Awards));
        return process == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(process);
    }

    [HttpPost("{id:guid}/evaluation-act/sign")]
    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    public async Task<ActionResult<PurchaseProcessDto>> SignEvaluationAct(Guid companyId, Guid id, [FromBody] SignEvaluationActRequest request)
    {
        var process = await _sender.Send(new SignEvaluationActCommand(companyId, id, request.EvaluatorId, request.SignatureImageBase64));
        return process == null ? NotFound(new { message = "Proceso de compra no encontrado." }) : Ok(process);
    }

    [HttpGet("{id:guid}/evaluation-act/pdf")]
    [Authorize]
    public async Task<IActionResult> GetEvaluationActPdf(Guid companyId, Guid id)
    {
        var process = await _sender.Send(new GetPurchaseProcessByIdQuery(companyId, id));
        if (process == null || !process.IsEvaluationActSigned)
        {
            return NotFound(new { message = "El acta de evaluacion no esta firmada o no esta disponible para este proceso." });
        }

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "documents", "evaluation-acts", $"{process.Id}.pdf");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "El archivo fisico del acta no fue encontrado en el servidor." });
        }

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, "application/pdf", $"Acta-Evaluacion-{process.Code}.pdf");
    }
}
