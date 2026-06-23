using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Auctions.DTOs;
using SICST.Application.Purchases.Commands;
using SICST.Application.Purchases.DTOs;
using SICST.Application.Suppliers.Commands;
using SICST.Application.Suppliers.DTOs;
using SICST.Application.Suppliers.Queries;
using SICST.Domain.Entities;
using SICST.Application.Common.Security;
using SICST.Application.Common.Models;

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
    public async Task<ActionResult<PagedResult<SupplierDto>>> GetAll([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var suppliers = await _sender.Send(new GetSuppliersQuery(pageNumber, pageSize));
        return Ok(suppliers);
    }

    [Authorize]
    [HttpGet("by-user/{userId:guid}")]
    public async Task<ActionResult<SupplierDto>> GetByUserId(Guid userId)
    {
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
        [FromForm] SupplierDocumentType type,
        [FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "El archivo es obligatorio." });
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

        try
        {
            var result = await _sender.Send(new RegisterSupplierDocumentCommand
            {
                SupplierId = supplierId,
                Type = type,
                FileName = file.FileName,
                ContentType = file.ContentType,
                StoragePath = Path.Combine("uploads", "suppliers", supplierId.ToString(), safeFileName)
            });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
