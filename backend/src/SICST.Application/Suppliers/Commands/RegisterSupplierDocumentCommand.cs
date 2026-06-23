using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Suppliers.Commands;

public record RegisterSupplierDocumentCommand : IRequest<SupplierDocumentDto>
{
    public Guid SupplierId { get; init; }
    public SupplierDocumentType Type { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ContentType { get; init; } = string.Empty;
    public string StoragePath { get; init; } = string.Empty;
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

        var document = new SupplierDocument
        {
            Id = Guid.NewGuid(),
            SupplierId = request.SupplierId,
            Type = request.Type,
            FileName = request.FileName.Trim(),
            ContentType = string.IsNullOrWhiteSpace(request.ContentType) ? "application/pdf" : request.ContentType.Trim(),
            StoragePath = request.StoragePath.Trim(),
            UploadedAtUtc = DateTime.UtcNow
        };

        _context.SupplierDocuments.Add(document);
        await _context.SaveChangesAsync(cancellationToken);

        return new SupplierDocumentDto
        {
            Id = document.Id,
            SupplierId = document.SupplierId,
            Type = document.Type,
            FileName = document.FileName,
            ContentType = document.ContentType,
            StoragePath = document.StoragePath,
            UploadedAtUtc = document.UploadedAtUtc
        };
    }
}
