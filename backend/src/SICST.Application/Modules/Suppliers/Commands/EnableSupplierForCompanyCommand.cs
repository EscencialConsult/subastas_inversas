using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Commands;

public record EnableSupplierForCompanyCommand : IRequest<CompanySupplierDto>
{
    public Guid CompanyId { get; init; }
    public Guid SupplierId { get; init; }
    public bool ArcaReviewed { get; init; }
    public bool DocumentsReviewed { get; init; }
    public bool WarningsAccepted { get; init; }
    public string? ReviewNotes { get; init; }
}

public class EnableSupplierForCompanyCommandHandler : IRequestHandler<EnableSupplierForCompanyCommand, CompanySupplierDto>
{
    private readonly IApplicationDbContext _context;

    public EnableSupplierForCompanyCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CompanySupplierDto> Handle(EnableSupplierForCompanyCommand request, CancellationToken cancellationToken)
    {
        var companyExists = await _context.Companies.AnyAsync(c => c.Id == request.CompanyId, cancellationToken);
        if (!companyExists)
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }

        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);
        if (supplier is null)
        {
            throw new InvalidOperationException("Proveedor no encontrado.");
        }

        if (!supplier.ArcaVerified || supplier.ArcaVerificationStatus != ArcaVerificationStatus.Verified)
        {
            throw new InvalidOperationException("El proveedor debe estar verificado por ARCA antes de habilitarlo para la empresa.");
        }

        if (!request.ArcaReviewed || !request.DocumentsReviewed || !request.WarningsAccepted)
        {
            throw new InvalidOperationException("Debes revisar ARCA, documentacion y aceptar las advertencias antes de habilitar al proveedor.");
        }

        var configuration = await _context.CompanyConfigurations
            .FirstOrDefaultAsync(c => c.CompanyId == request.CompanyId, cancellationToken);

        var strictPolicy = configuration?.RequireSupplierVerification ?? true;
        var now = DateTime.UtcNow;
        var documents = await _context.SupplierDocuments
            .Where(d => d.SupplierId == request.SupplierId)
            .ToListAsync(cancellationToken);

        var evaluation = SupplierCompanyPolicyEvaluator.Evaluate(documents, strictPolicy, now);
        foreach (var document in documents.Where(d => d.Status is SupplierDocumentStatus.ExpiringSoon or SupplierDocumentStatus.Expired))
        {
            document.AlertSentAtUtc ??= now;
        }

        var relation = await _context.CompanySuppliers
            .FirstOrDefaultAsync(cs => cs.CompanyId == request.CompanyId && cs.SupplierId == request.SupplierId, cancellationToken);

        if (relation == null)
        {
            relation = new CompanySupplier
            {
                Id = Guid.NewGuid(),
                CompanyId = request.CompanyId,
                SupplierId = request.SupplierId,
                LinkedAtUtc = now
            };

            _context.CompanySuppliers.Add(relation);
        }

        relation.Status = evaluation.Status;
        relation.WarningMessage = BuildReviewWarning(evaluation.WarningMessage, request.ReviewNotes);
        relation.EvaluatedAtUtc = now;

        await _context.SaveChangesAsync(cancellationToken);

        return new CompanySupplierDto
        {
            Id = relation.Id,
            CompanyId = relation.CompanyId,
            SupplierId = relation.SupplierId,
            Status = relation.Status,
            WarningMessage = relation.WarningMessage,
            StrictPolicyApplied = strictPolicy,
            LinkedAtUtc = relation.LinkedAtUtc,
            EvaluatedAtUtc = relation.EvaluatedAtUtc
        };
    }

    private static string? BuildReviewWarning(string? policyWarning, string? reviewNotes)
    {
        var notes = string.IsNullOrWhiteSpace(reviewNotes)
            ? null
            : reviewNotes.Trim();

        if (string.IsNullOrWhiteSpace(policyWarning) && notes is null)
        {
            return null;
        }

        var message = string.Join(
            " | ",
            new[]
            {
                policyWarning,
                notes is null ? null : $"Revision admin: {notes}"
            }.Where(part => !string.IsNullOrWhiteSpace(part)));

        return message.Length <= 500 ? message : message[..500];
    }
}
