using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record UpdatePurchaseProcessCommand : IRequest<PurchaseProcessDto?>
{
    public Guid Id { get; init; }
    public Guid CompanyId { get; init; }
    public Guid? ContractingModeId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal EstimatedBudget { get; init; }
    public List<PurchaseItemInputDto> Items { get; init; } = [];
}

public class UpdatePurchaseProcessCommandHandler : IRequestHandler<UpdatePurchaseProcessCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;

    public UpdatePurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto?> Handle(UpdatePurchaseProcessCommand request, CancellationToken cancellationToken)
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
            throw new InvalidOperationException("Solo se puede editar un proceso en borrador.");
        }

        if (request.EstimatedBudget < 0 || string.IsNullOrWhiteSpace(request.Title))
        {
            throw new InvalidOperationException("El proceso tiene datos invalidos.");
        }

        process.ContractingModeId = request.ContractingModeId;
        process.Title = request.Title.Trim();
        process.Description = request.Description.Trim();
        process.EstimatedBudget = request.EstimatedBudget;

        _context.PurchaseItems.RemoveRange(process.Items);
        process.Items = request.Items.Select(item => new PurchaseItem
        {
            Id = Guid.NewGuid(),
            PurchaseProcessId = process.Id,
            Description = item.Description.Trim(),
            Quantity = item.Quantity,
            Unit = item.Unit.Trim(),
            EstimatedUnitPrice = item.EstimatedUnitPrice
        }).ToList();

        await _context.SaveChangesAsync(cancellationToken);
        return PurchaseProcessMapping.ToDto(process);
    }
}
