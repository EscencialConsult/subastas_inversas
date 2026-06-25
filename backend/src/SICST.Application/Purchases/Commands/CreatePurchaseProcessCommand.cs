using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record CreatePurchaseProcessCommand : IRequest<PurchaseProcessDto>
{
    public Guid CompanyId { get; init; }
    public Guid BuyerId { get; init; }
    public Guid? ContractingModeId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public decimal EstimatedBudget { get; init; }
    public List<PurchaseItemInputDto> Items { get; init; } = [];
}

public class CreatePurchaseProcessCommandHandler : IRequestHandler<CreatePurchaseProcessCommand, PurchaseProcessDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePurchaseProcessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PurchaseProcessDto> Handle(CreatePurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        Validate(request.Title, request.EstimatedBudget, request.Items);
        await ValidateReferences(request, cancellationToken);
        var contractingModeId = await ResolveContractingModeId(request, cancellationToken);

        var process = new PurchaseProcess
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            BuyerId = request.BuyerId,
            ContractingModeId = contractingModeId,
            Code = await GenerateCode(request.CompanyId, cancellationToken),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            EstimatedBudget = request.EstimatedBudget,
            Status = PurchaseProcessStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
            Items = request.Items.Select(item => new PurchaseItem
            {
                Id = Guid.NewGuid(),
                Description = item.Description.Trim(),
                Quantity = item.Quantity,
                Unit = item.Unit.Trim(),
                EstimatedUnitPrice = item.EstimatedUnitPrice
            }).ToList()
        };

        _context.PurchaseProcesses.Add(process);
        await _context.SaveChangesAsync(cancellationToken);

        return PurchaseProcessMapping.ToDto(process);
    }

    private async Task ValidateReferences(CreatePurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == request.CompanyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }

        var buyer = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.BuyerId, cancellationToken);
        if (buyer == null || buyer.CompanyId != request.CompanyId)
        {
            throw new InvalidOperationException("Comprador no encontrado para la empresa.");
        }

        if (request.ContractingModeId.HasValue)
        {
            var modeExists = await _context.ContractingModes
                .AnyAsync(m => m.Id == request.ContractingModeId && m.CompanyId == request.CompanyId && m.Active, cancellationToken);

            if (!modeExists)
            {
                throw new InvalidOperationException("Modalidad de contratacion no encontrada para la empresa.");
            }
        }
    }

    private async Task<Guid?> ResolveContractingModeId(CreatePurchaseProcessCommand request, CancellationToken cancellationToken)
    {
        if (request.ContractingModeId.HasValue)
        {
            return request.ContractingModeId;
        }

        var suggestedMode = await ContractingModeRules.FindSuggestedMode(
            _context,
            request.CompanyId,
            request.EstimatedBudget,
            cancellationToken);

        return suggestedMode?.Id;
    }

    private static void Validate(string title, decimal estimatedBudget, List<PurchaseItemInputDto> items)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new InvalidOperationException("El titulo es obligatorio.");
        }

        if (estimatedBudget < 0)
        {
            throw new InvalidOperationException("El presupuesto no puede ser negativo.");
        }

        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Description))
            {
                throw new InvalidOperationException("Todos los items deben tener descripcion.");
            }

            if (item.Quantity <= 0)
            {
                throw new InvalidOperationException("La cantidad de cada item debe ser mayor a cero.");
            }
        }
    }

    private async Task<string> GenerateCode(Guid companyId, CancellationToken cancellationToken)
    {
        var count = await _context.PurchaseProcesses.CountAsync(p => p.CompanyId == companyId, cancellationToken);
        return $"PC-{count + 1:0000}";
    }
}
