using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Suppliers;
using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;
using System.Text.RegularExpressions;

namespace SICST.Application.Modules.Suppliers.Commands;

public record RegisterSupplierDocumentCommand : IRequest<SupplierDocumentDto>
{
    public Guid SupplierId { get; init; }
    public SupplierDocumentType Type { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public string StoragePath { get; init; } = string.Empty;
    public string Sha256Hash { get; init; } = string.Empty;
    public DateTime ExpiresAtUtc { get; init; }
}

public class RegisterSupplierDocumentCommandHandler : IRequestHandler<RegisterSupplierDocumentCommand, SupplierDocumentDto>
{
    private readonly IApplicationDbContext _context;

    public RegisterSupplierDocumentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDocumentDto> Handle(RegisterSupplierDocumentCommand request, CancellationToken cancellationToken)
    {
        var supplierExists = await _context.Suppliers
            .AnyAsync(s => s.Id == request.SupplierId, cancellationToken);

        if (!supplierExists)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        if (string.IsNullOrWhiteSpace(request.FileName) || string.IsNullOrWhiteSpace(request.StoragePath))
        {
            throw new InvalidOperationException("El documento debe tener nombre y ruta de almacenamiento.");
        }

        var normalizedHash = request.Sha256Hash.Trim().ToLowerInvariant();
        if (!Regex.IsMatch(normalizedHash, "^[a-f0-9]{64}$"))
        {
            throw new InvalidOperationException("El hash SHA-256 del documento no es valido.");
        }

        if (request.ExpiresAtUtc == default)
        {
            throw new InvalidOperationException("La fecha de vencimiento del documento es obligatoria.");
        }

        var now = DateTime.UtcNow;
        var expiresAtUtc = request.ExpiresAtUtc.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.ExpiresAtUtc, DateTimeKind.Utc)
            : request.ExpiresAtUtc.ToUniversalTime();

        // Evita documentos duplicados del mismo tipo. Si ya hay uno todavia vigente (no vencido)
        // de ese tipo, el proveedor primero debe eliminar el anterior (o esperar a que venza)
        // antes de subir uno nuevo. Los archivados NO cuentan: el filtro global de EF los excluye,
        // asi que un documento rechazado y ya eliminado deja libre el paso para el reemplazo.
        var yaTieneVigenteDelMismoTipo = await _context.SupplierDocuments
            .AnyAsync(
                d => d.SupplierId == request.SupplierId
                    && d.Type == request.Type
                    && d.ExpiresAtUtc > now,
                cancellationToken);

        if (yaTieneVigenteDelMismoTipo)
        {
            throw new InvalidOperationException(
                "Ya tenes un documento de este tipo cargado. Para subir uno nuevo, primero elimina el anterior desde su tarjeta (o espera a que venza).");
        }

        var document = new SupplierDocument
        {
            Id = Guid.NewGuid(),
            SupplierId = request.SupplierId,
            Type = request.Type,
            FileName = request.FileName.Trim(),
            ContentType = string.IsNullOrWhiteSpace(request.ContentType) ? "application/pdf" : request.ContentType.Trim(),
            StoragePath = request.StoragePath.Trim(),
            UploadedAtUtc = now,
            Sha256Hash = normalizedHash,
            ExpiresAtUtc = expiresAtUtc,
            Status = SupplierDocumentMapper.ResolveStatus(expiresAtUtc, now)
        };

        _context.SupplierDocuments.Add(document);
        await _context.SaveChangesAsync(cancellationToken);

        return SupplierDocumentMapper.ToDto(document);
    }
}
