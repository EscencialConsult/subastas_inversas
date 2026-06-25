using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers;
using SICST.Application.Suppliers.DTOs;
using SICST.Domain.Entities;
using System.Text.RegularExpressions;

namespace SICST.Application.Suppliers.Commands;

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
