using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Purchases.Commands;

public record SignEvaluationActCommand(
    Guid CompanyId,
    Guid PurchaseProcessId,
    Guid EvaluatorId,
    string SignatureImageBase64
) : IRequest<PurchaseProcessDto?>;

public class SignEvaluationActCommandHandler : IRequestHandler<SignEvaluationActCommand, PurchaseProcessDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly IPdfGenerator _pdfGenerator;
    private readonly IAdvancedDigitalSignatureService _signatureService;

    public SignEvaluationActCommandHandler(
        IApplicationDbContext context,
        IPdfGenerator pdfGenerator,
        IAdvancedDigitalSignatureService signatureService)
    {
        _context = context;
        _pdfGenerator = pdfGenerator;
        _signatureService = signatureService;
    }

    public async Task<PurchaseProcessDto?> Handle(SignEvaluationActCommand request, CancellationToken cancellationToken)
    {
        var process = await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation)
            .FirstOrDefaultAsync(p => p.Id == request.PurchaseProcessId && p.CompanyId == request.CompanyId, cancellationToken);

        if (process == null)
        {
            throw new InvalidOperationException("Proceso de compra no encontrado.");
        }

        if (process.Status != PurchaseProcessStatus.Approved)
        {
            throw new InvalidOperationException("Solo se puede firmar el acta de evaluación de un proceso aprobado.");
        }

        if (process.IsEvaluationActSigned)
        {
            throw new InvalidOperationException("El acta de evaluación ya está firmada.");
        }

        var invitations = await _context.Invitations
            .Include(i => i.Supplier)
            .Include(i => i.QualifiedBy)
            .Where(i => i.PurchaseProcessId == request.PurchaseProcessId && i.Status == InvitationStatus.Accepted)
            .ToListAsync(cancellationToken);

        if (!invitations.Any())
        {
            throw new InvalidOperationException("No hay proveedores calificados o invitados que hayan aceptado.");
        }

        if (invitations.Any(i => i.QualificationStatus == QualificationStatus.Pending))
        {
            throw new InvalidOperationException("Existen proveedores con calificación pendiente. Debe calificar a todos los proveedores antes de firmar el acta.");
        }

        var evaluator = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.EvaluatorId, cancellationToken);
        if (evaluator == null)
        {
            throw new InvalidOperationException("Evaluador no encontrado.");
        }

        // Generate SHA-256 Hash and signature based on deterministic data
        var materialBuilder = new StringBuilder();
        materialBuilder.Append("EvaluationAct").Append("|")
                       .Append(process.Id).Append("|")
                       .Append(process.Code).Append("|")
                       .Append(process.Title).Append("|")
                       .Append(evaluator.Id).Append("|")
                       .Append(evaluator.Email).Append("|");

        foreach (var inv in invitations.OrderBy(i => i.SupplierId))
        {
            materialBuilder.Append(inv.SupplierId).Append(",")
                           .Append(inv.QualificationStatus).Append(",")
                           .Append(inv.QualificationNotes ?? "").Append(";");
        }

        var material = materialBuilder.ToString();
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // System signature using HMAC SHA256 with key
        var signatureBytes = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("SICST_Evaluation_Act_Signing_Secret_Key_2026"),
            Encoding.UTF8.GetBytes(hash)
        );
        var signature = Convert.ToHexString(signatureBytes).ToLowerInvariant();
        await _signatureService.SignAsync(
            new AdvancedSignatureRequest(
                "evaluation-act",
                process.Id,
                evaluator.Id,
                evaluator.Email,
                material),
            cancellationToken);

        // Process base64 signature image
        byte[]? signatureImageBytes = null;
        if (!string.IsNullOrWhiteSpace(request.SignatureImageBase64))
        {
            var base64Data = request.SignatureImageBase64;
            if (base64Data.Contains(","))
            {
                base64Data = base64Data.Split(',')[1];
            }
            try
            {
                signatureImageBytes = Convert.FromBase64String(base64Data);
            }
            catch
            {
                // Ignore invalid base64 image data
            }
        }

        // Generate PDF
        _pdfGenerator.GenerateEvaluationAct(process, invitations, evaluator, hash, signature, signatureImageBytes);

        // Update process fields
        process.IsEvaluationActSigned = true;
        process.EvaluationActHash = hash;
        process.EvaluationActSignature = signature;
        process.EvaluationActSignedAtUtc = DateTime.UtcNow;
        process.EvaluationActSignedById = evaluator.Id;
        process.EvaluationActSignedBy = evaluator;

        await _context.SaveChangesAsync(cancellationToken);

        // Reload to map and return DTO
        return await _context.PurchaseProcesses
            .Include(p => p.Items)
            .Include(p => p.Evaluation)
            .Include(p => p.EvaluationActSignedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .Include(p => p.Awards).ThenInclude(a => a.AdjudicatedBy)
            .Include(p => p.Awards).ThenInclude(a => a.Items).ThenInclude(i => i.PurchaseItem)
            .Where(p => p.Id == process.Id)
            .Select(p => PurchaseProcessMapping.ToDto(p))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
