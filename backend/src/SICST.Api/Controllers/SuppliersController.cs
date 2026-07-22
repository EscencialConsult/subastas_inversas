using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Modules.Auctions.DTOs;
using SICST.Application.Modules.Purchases.Commands;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Application.Modules.Suppliers.Commands;
using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Application.Modules.Suppliers.Queries;
using SICST.Domain.Entities;
using SICST.Application.Common.Security;
using SICST.Application.Common.Models;
using System.Security.Claims;
using System.Security.Cryptography;

namespace SICST.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SuppliersController : ControllerBase
{
    private readonly ISender _sender;
    private readonly IWebHostEnvironment _environment;

    public SuppliersController(ISender sender, IWebHostEnvironment environment)
    {
        _sender = sender;
        _environment = environment;
    }

    // Lee del token (JWT) el ID del usuario logueado. Copiado del patrón ya usado en
    // ProfileController/AuthController. Lanza 401 si el token no trae un ID válido.
    private Guid GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(value, out var userId))
        {
            throw new UnauthorizedAccessException("Usuario no autenticado.");
        }

        return userId;
    }

    // "Personal del organismo" = cualquier rol que NO sea Proveedor (Admin, Comprador,
    // Evaluador, Autoridad, Auditor, SuperAdmin). Ellos pueden revisar la documentación de
    // cualquier proveedor; un Proveedor solo puede acceder a la suya.
    private bool EsPersonalDelOrganismo()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role is not null && role != nameof(UserRole.Proveedor);
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<SupplierRegistrationResponseDto>> Register([FromBody] RegisterSupplierCommand command)
    {
        try
        {
            var result = await _sender.Send(command);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    [HttpGet]
    public async Task<ActionResult<PagedResult<SupplierDto>>> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? companyId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? rubro = null,
        [FromQuery] string? province = null,
        [FromQuery] string? locality = null,
        [FromQuery] string? proximity = null)
    {
        var suppliers = await _sender.Send(new GetSuppliersQuery(
            pageNumber,
            pageSize,
            companyId,
            search,
            rubro,
            province,
            locality,
            proximity));
        return Ok(suppliers);
    }

    [Authorize(Policy = PermissionCodes.SuppliersManage)]
    [HttpDelete("{supplierId:guid}")]
    public async Task<IActionResult> Delete(Guid supplierId)
    {
        try
        {
            await _sender.Send(new DeleteSupplierCommand(supplierId));
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = PermissionCodes.SuppliersManage)]
    [HttpPost("{supplierId:guid}/arca/retry")]
    public async Task<IActionResult> RetryArcaVerification(Guid supplierId)
    {
        try
        {
            await _sender.Send(new RetrySupplierArcaVerificationCommand(supplierId));
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    [HttpGet("evaluation")]
    [HttpGet("/api/evaluation/suppliers")]
    public async Task<ActionResult<PagedResult<SupplierDto>>> GetForEvaluation(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? companyId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? rubro = null,
        [FromQuery] string? province = null,
        [FromQuery] string? locality = null,
        [FromQuery] string? proximity = null)
    {
        var suppliers = await _sender.Send(new GetSuppliersQuery(
            pageNumber,
            pageSize,
            companyId,
            search,
            rubro,
            province,
            locality,
            proximity));
        return Ok(suppliers);
    }

    [Authorize(Policy = PermissionCodes.AuditRead)]
    [HttpGet("/api/audit/suppliers")]
    public async Task<ActionResult<PagedResult<SupplierDto>>> GetForAudit(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? companyId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? rubro = null,
        [FromQuery] string? province = null,
        [FromQuery] string? locality = null,
        [FromQuery] string? proximity = null)
    {
        var suppliers = await _sender.Send(new GetSuppliersQuery(
            pageNumber,
            pageSize,
            companyId,
            search,
            rubro,
            province,
            locality,
            proximity));
        return Ok(suppliers);
    }

    [Authorize(Policy = PermissionCodes.AuditRead)]
    [HttpGet("{supplierId:guid}/arca-history")]
    public async Task<ActionResult<List<SICST.Application.Modules.Suppliers.DTOs.ArcaHistoryDto>>> GetArcaHistory(Guid supplierId)
    {
        var history = await _sender.Send(new GetSupplierArcaHistoryQuery(supplierId));
        return Ok(history);
    }

    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    [HttpPost("/api/companies/{companyId:guid}/suppliers/{supplierId:guid}/enable")]
    public async Task<ActionResult<CompanySupplierDto>> EnableForCompany(
        Guid companyId,
        Guid supplierId,
        [FromBody] EnableSupplierForCompanyReviewRequest request)
    {
        try
        {
            var result = await _sender.Send(new EnableSupplierForCompanyCommand
            {
                CompanyId = companyId,
                SupplierId = supplierId,
                ArcaReviewed = request.ArcaReviewed,
                DocumentsReviewed = request.DocumentsReviewed,
                WarningsAccepted = request.WarningsAccepted,
                ReviewNotes = request.ReviewNotes
            });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("by-user/{userId:guid}")]
    public async Task<ActionResult<SupplierDto>> GetByUserId(Guid userId)
    {
        // Un proveedor solo puede ver su propio perfil; el personal del organismo, cualquiera.
        // Esto cierra el "pivote" del IDOR: antes revelaba el supplierId de cualquier usuario.
        if (userId != GetCurrentUserId() && !EsPersonalDelOrganismo())
        {
            return Forbid();
        }

        var supplier = await _sender.Send(new GetSupplierByUserIdQuery(userId));

        if (supplier == null)
        {
            return NotFound(new { message = "Perfil de proveedor no encontrado." });
        }

        return Ok(supplier);
    }

    [Authorize]
    [HttpPost("{supplierId:guid}/documents")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<SupplierDocumentDto>> UploadDocument(
        Guid supplierId,
        [FromForm] UploadDocumentRequest request)
    {
        // Solo el proveedor dueño puede subir documentos a su propio legajo. Se valida ANTES
        // de escribir el archivo en disco, para no dejar archivos huérfanos ante un intento ajeno.
        var ownSupplier = await _sender.Send(new GetSupplierByUserIdQuery(GetCurrentUserId()));
        if (ownSupplier is null || ownSupplier.Id != supplierId)
        {
            return Forbid();
        }

        var file = request.File;
        var type = request.Type;
        var expiresAtUtc = request.ExpiresAtUtc;

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "El archivo es obligatorio." });
        }

        if (expiresAtUtc == default)
        {
            return BadRequest(new { message = "La fecha de vencimiento es obligatoria." });
        }

        if (!string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Solo se permiten archivos PDF." });
        }

        var uploadsRoot = Path.Combine(_environment.ContentRootPath, "uploads", "suppliers", supplierId.ToString());
        Directory.CreateDirectory(uploadsRoot);

        var safeFileName = $"{Guid.NewGuid()}-{Path.GetFileName(file.FileName)}";
        var fullPath = Path.Combine(uploadsRoot, safeFileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var sha256Hash = Convert.ToHexString(SHA256.HashData(await System.IO.File.ReadAllBytesAsync(fullPath))).ToLowerInvariant();

        try
        {
            var result = await _sender.Send(new RegisterSupplierDocumentCommand
            {
                SupplierId = supplierId,
                Type = type,
                FileName = file.FileName,
                ContentType = file.ContentType,
                StoragePath = Path.Combine("uploads", "suppliers", supplierId.ToString(), safeFileName),
                Sha256Hash = sha256Hash,
                ExpiresAtUtc = expiresAtUtc
            });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("{supplierId:guid}/documents")]
    public async Task<ActionResult<List<SupplierDocumentDto>>> GetDocuments(Guid supplierId)
    {
        try
        {
            var documents = await _sender.Send(
                new GetSupplierDocumentsQuery(supplierId, GetCurrentUserId(), EsPersonalDelOrganismo()));
            return Ok(documents);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("documents/{documentId:guid}/file")]
    public async Task<IActionResult> GetDocumentFile(Guid documentId)
    {
        var document = await _sender.Send(
            new GetSupplierDocumentFileQuery(documentId, GetCurrentUserId(), EsPersonalDelOrganismo()));
        if (document is null)
        {
            return NotFound(new { message = "Documento no encontrado." });
        }

        var fullPath = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, document.StoragePath));
        var uploadsRoot = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "uploads"));

        if (!fullPath.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(fullPath))
        {
            return NotFound(new { message = "Archivo no encontrado." });
        }

        var contentType = string.IsNullOrWhiteSpace(document.ContentType)
            ? "application/pdf"
            : document.ContentType;

        return PhysicalFile(fullPath, contentType, document.FileName, enableRangeProcessing: true);
    }

    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    [HttpPost("documents/{documentId:guid}/observations")]
    public async Task<ActionResult<SupplierDocumentReviewDto>> ObserveDocument(
        Guid documentId,
        [FromBody] ObserveSupplierDocumentCommand command)
    {
        if (documentId != command.DocumentId)
        {
            return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
        }

        try
        {
            return Ok(await _sender.Send(command));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("documents/{documentId:guid}/remediations")]
    public async Task<ActionResult<SupplierDocumentReviewDto>> RemediateDocument(
        Guid documentId,
        [FromBody] SubmitSupplierDocumentRemediationCommand command)
    {
        // Subsanar es una acción del proveedor dueño. Tomamos su identidad del token, no del
        // cuerpo del pedido (que era manipulable). El handler verifica que el documento sea suyo.
        var ownSupplier = await _sender.Send(new GetSupplierByUserIdQuery(GetCurrentUserId()));
        if (ownSupplier is null)
        {
            return Forbid();
        }

        try
        {
            var result = await _sender.Send(
                command with { DocumentId = documentId, SupplierId = ownSupplier.Id });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = PermissionCodes.PurchasesEvaluate)]
    [HttpPost("documents/{documentId:guid}/verdicts")]
    public async Task<ActionResult<SupplierDocumentReviewDto>> IssueDocumentVerdict(
        Guid documentId,
        [FromBody] IssueSupplierDocumentVerdictCommand command)
    {
        if (documentId != command.DocumentId)
        {
            return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
        }

        try
        {
            return Ok(await _sender.Send(command));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("{supplierId:guid}/documents/alerts")]
    public async Task<ActionResult<List<SupplierDocumentDto>>> GetDocumentAlerts(Guid supplierId, [FromQuery] int daysAhead = 30)
    {
        try
        {
            var documents = await _sender.Send(
                new GetSupplierDocumentsQuery(supplierId, GetCurrentUserId(), EsPersonalDelOrganismo()));
            var alerts = documents
                .Where(d => d.Status is SupplierDocumentStatus.ExpiringSoon or SupplierDocumentStatus.Expired)
                .Where(d => d.ExpiresAtUtc <= DateTime.UtcNow.AddDays(Math.Max(0, daysAhead)))
                .ToList();

            return Ok(alerts);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Policy = PermissionCodes.PurchasesManage)]
    [HttpGet("documents/expiring")]
    public async Task<ActionResult<List<SupplierDocumentDto>>> GetExpiringDocuments([FromQuery] int daysAhead = 30)
    {
        var documents = await _sender.Send(new GetExpiringSupplierDocumentsQuery(daysAhead));
        return Ok(documents);
    }

    [Authorize]
    [HttpGet("{supplierId:guid}/invitations")]
    public async Task<ActionResult<List<InvitationDto>>> GetInvitations(Guid supplierId)
    {
        try
        {
            var invitations = await _sender.Send(new GetInvitationsBySupplierQuery(supplierId));
            return Ok(invitations);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPatch("invitations/{invitationId:guid}/respond")]
    public async Task<ActionResult<InvitationDto>> RespondToInvitation(Guid invitationId, [FromBody] RespondToInvitationCommand command)
    {
        if (invitationId != command.InvitationId)
        {
            return BadRequest(new { message = "El ID de la URL no coincide con el cuerpo." });
        }

        try
        {
            var invitation = await _sender.Send(command);
            return Ok(invitation);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("{supplierId:guid}/auctions")]
    public async Task<ActionResult<List<SupplierAuctionDto>>> GetAuctions(Guid supplierId)
    {
        try
        {
            var auctions = await _sender.Send(new GetSupplierAuctionsQuery(supplierId));
            return Ok(auctions);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("{supplierId:guid}/auctions/{auctionId:guid}")]
    public async Task<ActionResult<SupplierAuctionDto>> GetAuctionById(Guid supplierId, Guid auctionId)
    {
        var auction = await _sender.Send(new GetSupplierAuctionByIdQuery(supplierId, auctionId));

        if (auction == null)
            return NotFound(new { message = "Subasta no encontrada o no tienes acceso." });

        return Ok(auction);
    }
}

public class UploadDocumentRequest
{
    public SupplierDocumentType Type { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public IFormFile File { get; set; } = null!;
}

public class EnableSupplierForCompanyReviewRequest
{
    public bool ArcaReviewed { get; set; }
    public bool DocumentsReviewed { get; set; }
    public bool WarningsAccepted { get; set; }
    public string? ReviewNotes { get; set; }
}
