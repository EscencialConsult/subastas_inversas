using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record RegisterContractPaymentCommand : IRequest<ContractPaymentDto?>
{
    public Guid CompanyId { get; init; }
    public Guid ContractId { get; init; }
    public Guid RegisteredById { get; init; }
    public DateTime? PaymentDateUtc { get; init; }
    public decimal PaymentAmount { get; init; }
    public decimal PenaltyAmount { get; init; }
    public int DelayDays { get; init; }
    public string Notes { get; init; } = string.Empty;
}

public class RegisterContractPaymentCommandHandler : IRequestHandler<RegisterContractPaymentCommand, ContractPaymentDto?>
{
    private readonly IApplicationDbContext _context;

    public RegisterContractPaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ContractPaymentDto?> Handle(RegisterContractPaymentCommand request, CancellationToken cancellationToken)
    {
        if (request.PaymentAmount < 0 || request.PenaltyAmount < 0)
        {
            throw new InvalidOperationException("Los importes de pago y penalidad no pueden ser negativos.");
        }

        if (request.DelayDays < 0)
        {
            throw new InvalidOperationException("Los dias de demora no pueden ser negativos.");
        }

        if (request.PaymentAmount == 0 && request.PenaltyAmount == 0)
        {
            throw new InvalidOperationException("Debe registrar un pago o una penalidad.");
        }

        if (request.DelayDays == 0 && request.PenaltyAmount > 0)
        {
            throw new InvalidOperationException("Para registrar una penalidad por demora indique los dias de atraso.");
        }

        var contract = await _context.Contracts
            .Include(c => c.PurchaseProcess).ThenInclude(p => p.Contracts).ThenInclude(c => c.Payments)
            .Include(c => c.PurchaseOrder)
            .Include(c => c.Payments).ThenInclude(p => p.RegisteredBy)
            .FirstOrDefaultAsync(c => c.Id == request.ContractId && c.CompanyId == request.CompanyId, cancellationToken);

        if (contract == null)
        {
            return null;
        }

        if (contract.Status != ContractStatus.Active)
        {
            throw new InvalidOperationException("Solo se pueden registrar pagos sobre contratos activos.");
        }

        if (contract.PurchaseOrder == null)
        {
            throw new InvalidOperationException("Debe emitirse la orden de compra antes de registrar pagos.");
        }

        var operatorUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.RegisteredById && u.CompanyId == request.CompanyId, cancellationToken);

        if (operatorUser == null)
        {
            throw new InvalidOperationException("El operador que registra el pago no fue encontrado.");
        }

        var payment = new ContractPayment
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            ContractId = contract.Id,
            RegisteredById = request.RegisteredById,
            PaymentDateUtc = request.PaymentDateUtc ?? DateTime.UtcNow,
            PaymentAmount = request.PaymentAmount,
            PenaltyAmount = request.PenaltyAmount,
            DelayDays = request.DelayDays,
            Notes = request.Notes.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.ContractPayments.Add(payment);
        contract.Payments.Add(payment);

        var settledAmount = contract.Payments.Sum(p => p.PaymentAmount + p.PenaltyAmount);
        if (settledAmount >= contract.Amount && contract.PurchaseOrder.Status == PurchaseOrderStatus.Received)
        {
            contract.Status = ContractStatus.Completed;

            var allContractsSettled = contract.PurchaseProcess.Contracts
                .All(c => c.Id == contract.Id || c.Status == ContractStatus.Completed);

            if (allContractsSettled)
            {
                contract.PurchaseProcess.Status = PurchaseProcessStatus.Closed;
                contract.PurchaseProcess.ClosedAtUtc ??= DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        payment.RegisteredBy = operatorUser;
        return PurchaseProcessMapping.ToContractPaymentDto(payment);
    }
}
