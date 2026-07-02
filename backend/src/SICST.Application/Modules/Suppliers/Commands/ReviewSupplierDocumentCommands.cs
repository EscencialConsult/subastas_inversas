using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Suppliers.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Suppliers.Commands;

public record ObserveSupplierDocumentCommand : IRequest<SupplierDocumentReviewDto>
{
    public Guid DocumentId { get; init; }
    public Guid EvaluatorId { get; init; }
    public string Notes { get; init; } = string.Empty;
}

public record SubmitSupplierDocumentRemediationCommand : IRequest<SupplierDocumentReviewDto>
{
    public Guid DocumentId { get; init; }
    public Guid SupplierId { get; init; }
    public string Notes { get; init; } = string.Empty;
}

public record IssueSupplierDocumentVerdictCommand : IRequest<SupplierDocumentReviewDto>
{
    public Guid DocumentId { get; init; }
    public Guid EvaluatorId { get; init; }
    public SupplierDocumentVerdict Verdict { get; init; }
    public string Notes { get; init; } = string.Empty;
    public string? ExceptionReason { get; init; }
}

public class ObserveSupplierDocumentCommandHandler : IRequestHandler<ObserveSupplierDocumentCommand, SupplierDocumentReviewDto>
{
    private readonly IApplicationDbContext _context;

    public ObserveSupplierDocumentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDocumentReviewDto> Handle(ObserveSupplierDocumentCommand request, CancellationToken cancellationToken)
    {
        await EnsureDocumentExists(request.DocumentId, cancellationToken);
        await EnsureEvaluatorExists(request.EvaluatorId, cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Notes))
        {
            throw new InvalidOperationException("La observacion es obligatoria.");
        }

        var review = CreateReview(
            request.DocumentId,
            request.EvaluatorId,
            SupplierDocumentReviewAction.Observation,
            request.Notes);

        _context.SupplierDocumentReviews.Add(review);
        await _context.SaveChangesAsync(cancellationToken);
        return ToDto(review);
    }

    private async Task EnsureDocumentExists(Guid documentId, CancellationToken cancellationToken)
    {
        if (!await _context.SupplierDocuments.AnyAsync(d => d.Id == documentId, cancellationToken))
        {
            throw new InvalidOperationException("Documento no encontrado.");
        }
    }

    private async Task EnsureEvaluatorExists(Guid evaluatorId, CancellationToken cancellationToken)
    {
        var evaluator = await _context.Users.FirstOrDefaultAsync(u => u.Id == evaluatorId, cancellationToken);
        if (evaluator == null || evaluator.Role != UserRole.Evaluador)
        {
            throw new InvalidOperationException("Evaluador no encontrado.");
        }
    }

    public static SupplierDocumentReview CreateReview(
        Guid documentId,
        Guid? reviewerId,
        SupplierDocumentReviewAction action,
        string notes,
        SupplierDocumentVerdict? verdict = null,
        string? exceptionReason = null)
    {
        return new SupplierDocumentReview
        {
            Id = Guid.NewGuid(),
            SupplierDocumentId = documentId,
            ReviewerId = reviewerId,
            Action = action,
            Verdict = verdict,
            Notes = notes.Trim(),
            ExceptionReason = string.IsNullOrWhiteSpace(exceptionReason) ? null : exceptionReason.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };
    }

    public static SupplierDocumentReviewDto ToDto(SupplierDocumentReview review)
    {
        return new SupplierDocumentReviewDto
        {
            Id = review.Id,
            SupplierDocumentId = review.SupplierDocumentId,
            ReviewerId = review.ReviewerId,
            Action = review.Action,
            Verdict = review.Verdict,
            Notes = review.Notes,
            ExceptionReason = review.ExceptionReason,
            CreatedAtUtc = review.CreatedAtUtc
        };
    }
}

public class SubmitSupplierDocumentRemediationCommandHandler : IRequestHandler<SubmitSupplierDocumentRemediationCommand, SupplierDocumentReviewDto>
{
    private readonly IApplicationDbContext _context;

    public SubmitSupplierDocumentRemediationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDocumentReviewDto> Handle(SubmitSupplierDocumentRemediationCommand request, CancellationToken cancellationToken)
    {
        var document = await _context.SupplierDocuments
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId, cancellationToken);

        if (document == null)
        {
            throw new InvalidOperationException("Documento no encontrado.");
        }

        if (document.SupplierId != request.SupplierId)
        {
            throw new InvalidOperationException("El documento no pertenece al proveedor.");
        }

        if (string.IsNullOrWhiteSpace(request.Notes))
        {
            throw new InvalidOperationException("La subsanacion es obligatoria.");
        }

        var review = ObserveSupplierDocumentCommandHandler.CreateReview(
            request.DocumentId,
            null,
            SupplierDocumentReviewAction.Remediation,
            request.Notes);

        _context.SupplierDocumentReviews.Add(review);
        await _context.SaveChangesAsync(cancellationToken);
        return ObserveSupplierDocumentCommandHandler.ToDto(review);
    }
}

public class IssueSupplierDocumentVerdictCommandHandler : IRequestHandler<IssueSupplierDocumentVerdictCommand, SupplierDocumentReviewDto>
{
    private readonly IApplicationDbContext _context;

    public IssueSupplierDocumentVerdictCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SupplierDocumentReviewDto> Handle(IssueSupplierDocumentVerdictCommand request, CancellationToken cancellationToken)
    {
        var document = await _context.SupplierDocuments
            .Include(d => d.Supplier)
            .FirstOrDefaultAsync(d => d.Id == request.DocumentId, cancellationToken);

        if (document == null)
        {
            throw new InvalidOperationException("Documento no encontrado.");
        }

        var evaluator = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.EvaluatorId, cancellationToken);
        if (evaluator == null || evaluator.Role != UserRole.Evaluador)
        {
            throw new InvalidOperationException("Evaluador no encontrado.");
        }

        var hasVerdict = await _context.SupplierDocumentReviews
            .AnyAsync(r => r.SupplierDocumentId == request.DocumentId && r.Action == SupplierDocumentReviewAction.Verdict, cancellationToken);

        if (hasVerdict)
        {
            throw new InvalidOperationException("El documento ya tiene un dictamen inmutable.");
        }

        if (string.IsNullOrWhiteSpace(request.Notes))
        {
            throw new InvalidOperationException("Las notas del dictamen son obligatorias.");
        }

        if (request.Verdict == SupplierDocumentVerdict.ApprovedWithException &&
            string.IsNullOrWhiteSpace(request.ExceptionReason))
        {
            throw new InvalidOperationException("La excepcion del evaluador debe quedar registrada.");
        }

        var review = ObserveSupplierDocumentCommandHandler.CreateReview(
            request.DocumentId,
            request.EvaluatorId,
            SupplierDocumentReviewAction.Verdict,
            request.Notes,
            request.Verdict,
            request.ExceptionReason);

        _context.SupplierDocumentReviews.Add(review);

        // Actualizar el estado del proveedor segun los veredictos de todos sus documentos
        if (request.Verdict == SupplierDocumentVerdict.Approved || request.Verdict == SupplierDocumentVerdict.ApprovedWithException)
        {
            var allSupplierDocuments = await _context.SupplierDocuments
                .Include(d => d.Reviews)
                .Where(d => d.SupplierId == document.SupplierId)
                .ToListAsync(cancellationToken);

            bool allOthersApproved = true;
            foreach (var doc in allSupplierDocuments)
            {
                if (doc.Id == request.DocumentId)
                {
                    continue;
                }

                var latestVerdict = doc.Reviews
                    .Where(r => r.Action == SupplierDocumentReviewAction.Verdict)
                    .OrderByDescending(r => r.CreatedAtUtc)
                    .FirstOrDefault();

                if (latestVerdict == null ||
                    (latestVerdict.Verdict != SupplierDocumentVerdict.Approved &&
                     latestVerdict.Verdict != SupplierDocumentVerdict.ApprovedWithException))
                {
                    allOthersApproved = false;
                    break;
                }
            }

            if (allOthersApproved)
            {
                document.Supplier.Status = SupplierStatus.Verified;
            }
        }
        else if (request.Verdict == SupplierDocumentVerdict.Rejected)
        {
            document.Supplier.Status = SupplierStatus.Rejected;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return ObserveSupplierDocumentCommandHandler.ToDto(review);
    }
}
