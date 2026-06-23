using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record RegisterEvaluationCommand(
    Guid CompanyId,
    Guid Id,
    Guid EvaluadorId,
    string RecomendadoProveedor,
    string Observaciones
) : IRequest<PurchaseProcessDto?>;

public class RegisterEvaluationCommandHandler : IRequestHandler<RegisterEvaluationCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public RegisterEvaluationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(RegisterEvaluationCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Evaluation)
        {
            throw new InvalidOperationException("Solo se pueden registrar evaluaciones en la etapa de evaluación.");
        }

        if (process.Evaluation != null)
        {
            throw new InvalidOperationException("Este proceso ya tiene una evaluación registrada.");
        }

        var evaluation = new Evaluation
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            EvaluatorId = request.EvaluadorId,
            RecommendedSupplier = request.RecomendadoProveedor,
            Observations = request.Observaciones,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.Evaluations.Add(evaluation);
        await _context.SaveChangesAsync(cancellationToken);

        // Reload to get mapped details with evaluator
        return await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation).ThenInclude(e => e!.Evaluator)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.AdjudicatedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Where(p => p.Id == process.Id)
            .Select(p => PurchaseProcessMapping.ToDto(p))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
