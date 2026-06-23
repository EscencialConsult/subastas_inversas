using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record CreateContractCommand : IRequest<ContractDto?>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public Guid? AwardId { get; init; }
    public DateTime? StartDateUtc { get; init; }
    public DateTime? EndDateUtc { get; init; }
    public string Terms { get; init; } = string.Empty;
}

public class CreateContractCommandHandler : IRequestHandler<CreateContractCommand, ContractDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;

    public CreateContractCommandHandler(IApplicationDbContext context, IPdfGenerator pdfGenerator)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
    }

    public async Task<ContractDto?> Handle(CreateContractCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Include(p => p.Contracts)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        if (process.Status != PurchaseProcessStatus.Adjudicated)
        {
            throw new InvalidOperationException("Solo se puede generar contrato para procesos adjudicados.");
        }

        var award = request.AwardId.HasValue
            ? process.Awards.FirstOrDefault(a => a.Id == request.AwardId.Value)
            : process.Awards.FirstOrDefault(a => process.Contracts.All(c => c.AwardId != a.Id));

        if (award == null)
        {
            throw new InvalidOperationException("No se puede generar contrato sin adjudicacion.");
        }

        if (process.Contracts.Any(c => c.AwardId == award.Id))
        {
            throw new InvalidOperationException("Esta adjudicacion ya tiene un contrato generado.");
        }

        var count = await _context.Contracts.CountAsync(c => c.CompanyId == request.CompanyId, cancellationToken);
        var contract = new Contract
        {
            Id = Guid.NewGuid(),
            CompanyId = process.CompanyId,
            PurchaseProcessId = process.Id,
            AwardId = award.Id,
            SupplierId = award.SupplierId,
            Number = $"CT-{DateTime.UtcNow:yyyy}-{count + 1:0000}",
            Amount = award.Amount,
            StartDateUtc = request.StartDateUtc ?? DateTime.UtcNow,
            EndDateUtc = request.EndDateUtc,
            Status = ContractStatus.Active,
            Terms = request.Terms.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            SignedAtUtc = DateTime.UtcNow,
            DocumentPath = string.Empty
        };

        contract.DocumentPath = _pdfGenerator.GenerateContract(process, contract, award.Supplier);
        _context.Contracts.Add(contract);
        process.Status = PurchaseProcessStatus.Contracted;

        await _context.SaveChangesAsync(cancellationToken);

        contract.Supplier = award.Supplier;
        return PurchaseProcessMapping.ToContractDto(contract);
    }
}
