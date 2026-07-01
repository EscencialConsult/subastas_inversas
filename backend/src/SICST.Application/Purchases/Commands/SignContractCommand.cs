using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration;
using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases.Commands;

public record SignContractCommand : IRequest<ContractDto?>
{
    public Guid CompanyId { get; init; }
    public Guid PurchaseProcessId { get; init; }
    public Guid ContractId { get; init; }
    public Guid SignedByOperatorId { get; init; }
    public string OtpCode { get; init; } = string.Empty;
}

public class SignContractCommandHandler : IRequestHandler<SignContractCommand, ContractDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;
    private readonly IMfaProvider _mfaProvider;
    private readonly IAdvancedDigitalSignatureService _signatureService;

    public SignContractCommandHandler(
        IApplicationDbContext context,
        IPdfGenerator pdfGenerator,
        IMfaProvider mfaProvider,
        IAdvancedDigitalSignatureService signatureService)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
        _mfaProvider = mfaProvider;
        _signatureService = signatureService;
    }

    public async Task<ContractDto?> Handle(SignContractCommand request, CancellationToken cancellationToken)
    {
        var contract = await _context.Contracts
            .Include(c => c.Supplier)
            .Include(c => c.Award)
            .FirstOrDefaultAsync(c =>
                c.Id == request.ContractId &&
                c.PurchaseProcessId == request.PurchaseProcessId &&
                c.CompanyId == request.CompanyId,
                cancellationToken);

        if (contract == null)
        {
            return null;
        }

        if (contract.Status != ContractStatus.Draft)
        {
            throw new InvalidOperationException("Solo se pueden firmar contratos en estado borrador.");
        }

        var operatorUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.SignedByOperatorId && u.CompanyId == request.CompanyId, cancellationToken);

        if (operatorUser == null)
        {
            throw new InvalidOperationException("El operador firmante no fue encontrado.");
        }

        if (!operatorUser.MfaEnabled || string.IsNullOrWhiteSpace(operatorUser.MfaSecret))
        {
            throw new InvalidOperationException("Debe tener la autenticacion de dos factores (MFA) habilitada para firmar.");
        }

        if (!_mfaProvider.VerifyCode(operatorUser.MfaSecret, request.OtpCode))
        {
            throw new InvalidOperationException("El codigo OTP ingresado no es valido.");
        }

        var process = await _context.PurchaseProcesses
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            return null;
        }

        var template = await DocumentTemplateRules.EnsureActiveTemplate(
            _context,
            request.CompanyId,
            DocumentTemplateType.Contract,
            cancellationToken);

        var now = DateTime.UtcNow;

        var material = $"{contract.Number}:{contract.Amount}:{contract.Terms}:{now:O}";
        var advancedSignature = await _signatureService.SignAsync(
            new AdvancedSignatureRequest(
                "contract",
                contract.Id,
                operatorUser.Id,
                operatorUser.Email,
                material),
            cancellationToken);

        contract.Status = ContractStatus.Active;
        contract.SignedAtUtc = now;
        contract.SignedByOperatorId = request.SignedByOperatorId;
        contract.SignatureHash = advancedSignature.ContentHash;
        contract.DocumentTemplateId = template.Id;

        contract.DocumentPath = _pdfGenerator.GenerateContract(process, contract, contract.Supplier, template);
        process.Status = PurchaseProcessStatus.Contracted;

        await _context.SaveChangesAsync(cancellationToken);

        contract.SignedByOperator = operatorUser;

        return PurchaseProcessMapping.ToContractDto(contract);
    }
}
