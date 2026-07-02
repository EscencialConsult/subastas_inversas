using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Events;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record PublishPurchaseProcessCommand(Guid CompanyId, Guid Id) : IRequest<PurchaseProcessDto?>;

public class PublishPurchaseProcessCommandHandler : IRequestHandler<PublishPurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IOutboxWriter _outbox;

    public PublishPurchaseProcessCommandHandler(IApplicationDbContext context, IOutboxWriter? outbox = null)
    {
        _context = context;
        _outbox = outbox ?? NullOutboxWriter.Instance;
    }

    public async Task<PurchaseProcessDto?> Handle(PublishPurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Draft)
        {
            throw new InvalidOperationException("Solo se puede publicar un proceso en borrador.");
        }

        // Calcular hash de especificaciones
        var specLines = new List<string>
        {
            process.Title,
            process.Description,
            process.EstimatedBudget.ToString("G", System.Globalization.CultureInfo.InvariantCulture)
        };
        foreach (var item in process.Items.OrderBy(i => i.Description).ThenBy(i => i.Quantity))
        {
            specLines.Add(item.Description);
            specLines.Add(item.Quantity.ToString("G", System.Globalization.CultureInfo.InvariantCulture));
            specLines.Add(item.Unit);
            specLines.Add(item.EstimatedUnitPrice?.ToString("G", System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty);
        }
        var material = string.Join("|", specLines);
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        process.SpecificationsHash = Convert.ToHexString(bytes).ToLowerInvariant();

        var workflow = await ApprovalWorkflowRules.FindWorkflowForAmount(
            _context,
            request.CompanyId,
            process.EstimatedBudget,
            cancellationToken);
        var requiredLevels = workflow == null
            ? []
            : ApprovalWorkflowRouting.GetRequiredLevels(workflow, process.EstimatedBudget);

        process.Status = requiredLevels.Count == 0
            ? PurchaseProcessStatus.Approved
            : PurchaseProcessStatus.PendingApproval;
        process.PublishedAtUtc = DateTime.UtcNow;
        _outbox.Add(new PurchaseProcessPublished(
            Guid.NewGuid(),
            request.CompanyId,
            process.Id,
            process.Code,
            process.PublishedAtUtc.Value,
            DateTime.UtcNow));

        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }
}
