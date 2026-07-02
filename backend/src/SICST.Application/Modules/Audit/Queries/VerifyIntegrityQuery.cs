using SICST.Application.Common.Security;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Auctions;
using SICST.Application.Modules.Audit.DTOs;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Purchases;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Audit.Queries;

public record VerifyIntegrityQuery(Guid? CompanyId = null) : IRequest<IntegrityVerificationDto>;

public class VerifyIntegrityQueryHandler : IRequestHandler<VerifyIntegrityQuery, IntegrityVerificationDto>
{
    private const string EvaluationActSigningKey = "SICST_Evaluation_Act_Signing_Secret_Key_2026";

    private readonly IApplicationDbContext _context;

    public VerifyIntegrityQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IntegrityVerificationDto> Handle(VerifyIntegrityQuery request, CancellationToken cancellationToken)
    {
        var result = new IntegrityVerificationDto
        {
            VerifiedAtUtc = DateTime.UtcNow
        };

        await VerifyAuditChain(result, cancellationToken);
        await VerifyBidChains(result, request.CompanyId, cancellationToken);
        await VerifyAuctionClosingActHashes(result, request.CompanyId, cancellationToken);
        await VerifyEvaluationActSignatures(result, request.CompanyId, cancellationToken);
        await VerifyAwardHashes(result, request.CompanyId, cancellationToken);
        await VerifyContractSignatures(result, request.CompanyId, cancellationToken);

        result.IsValid = result.Findings.Count == 0;
        return result;
    }

    private async Task VerifyAuditChain(IntegrityVerificationDto result, CancellationToken cancellationToken)
    {
        var events = await _context.AuditEvents
            .IgnoreQueryFilters()
            .OrderBy(e => e.Sequence)
            .ToListAsync(cancellationToken);

        result.AuditEventsChecked = events.Count;
        var previousHash = string.Empty;
        long expectedSequence = 1;

        foreach (var auditEvent in events)
        {
            if (auditEvent.Sequence != expectedSequence)
            {
                AddFinding(result, "audit_chain", nameof(AuditEvent), auditEvent.Id,
                    $"Secuencia de auditoria inesperada. Se esperaba {expectedSequence} y se encontro {auditEvent.Sequence}.");
            }

            if (!HashesEqual(auditEvent.PreviousHash, previousHash))
            {
                AddFinding(result, "audit_chain", nameof(AuditEvent), auditEvent.Id,
                    "El PreviousHash del evento de auditoria no coincide con el hash del evento anterior.",
                    previousHash,
                    auditEvent.PreviousHash);
            }

            var expectedHash = ComputeAuditEventHash(auditEvent);
            if (!HashesEqual(auditEvent.Hash, expectedHash))
            {
                AddFinding(result, "audit_chain", nameof(AuditEvent), auditEvent.Id,
                    "El hash del evento de auditoria no coincide con el contenido registrado.",
                    expectedHash,
                    auditEvent.Hash);
            }

            previousHash = auditEvent.Hash;
            expectedSequence++;
        }
    }

    private async Task VerifyBidChains(IntegrityVerificationDto result, Guid? companyId, CancellationToken cancellationToken)
    {
        var query = _context.Auctions
            .Include(a => a.Bids)
            .AsQueryable();

        if (companyId.HasValue)
        {
            query = query.Where(a => a.CompanyId == companyId.Value);
        }

        var auctions = await query.ToListAsync(cancellationToken);
        result.BidChainsChecked = auctions.Count;

        foreach (var auction in auctions)
        {
            var previousHash = string.Empty;
            var expectedSequence = 1;
            foreach (var bid in auction.Bids.OrderBy(b => b.SequenceNumber).ThenBy(b => b.PlacedAtUtc))
            {
                result.BidsChecked++;

                if (bid.SequenceNumber != expectedSequence)
                {
                    AddFinding(result, "bid_chain", nameof(Bid), bid.Id,
                        $"Secuencia de lance inesperada en subasta {auction.Id}. Se esperaba {expectedSequence} y se encontro {bid.SequenceNumber}.");
                }

                if (!HashesEqual(bid.PreviousHash, previousHash))
                {
                    AddFinding(result, "bid_chain", nameof(Bid), bid.Id,
                        "El PreviousHash del lance no coincide con el hash del lance anterior.",
                        previousHash,
                        bid.PreviousHash);
                }

                var expectedHash = ComputeBidHash(bid);
                if (!HashesEqual(bid.Hash, expectedHash))
                {
                    AddFinding(result, "bid_chain", nameof(Bid), bid.Id,
                        "El hash del lance no coincide con los datos registrados.",
                        expectedHash,
                        bid.Hash);
                }

                previousHash = bid.Hash;
                expectedSequence++;
            }
        }
    }

    private async Task VerifyAuctionClosingActHashes(IntegrityVerificationDto result, Guid? companyId, CancellationToken cancellationToken)
    {
        var query = _context.Auctions
            .Include(a => a.PurchaseProcess)
            .Include(a => a.Bids).ThenInclude(b => b.Supplier)
            .Where(a => !string.IsNullOrWhiteSpace(a.ClosingActHash));

        if (companyId.HasValue)
        {
            query = query.Where(a => a.CompanyId == companyId.Value);
        }

        var auctions = await query.ToListAsync(cancellationToken);
        foreach (var auction in auctions)
        {
            result.SignaturesChecked++;
            var rows = AuctionClosingAct.BuildComparisonRows(auction);
            var expectedHash = AuctionClosingAct.ComputeHash(auction, rows);
            if (!HashesEqual(auction.ClosingActHash, expectedHash))
            {
                AddFinding(result, "auction_closing_act", nameof(Auction), auction.Id,
                    "El hash del acta de cierre de subasta no coincide con los lances y datos de cierre.",
                    expectedHash,
                    auction.ClosingActHash ?? string.Empty);
            }
        }
    }

    private async Task VerifyEvaluationActSignatures(IntegrityVerificationDto result, Guid? companyId, CancellationToken cancellationToken)
    {
        var query = _context.PurchaseProcesses
            .Include(p => p.EvaluationActSignedBy)
            .Where(p => p.IsEvaluationActSigned);

        if (companyId.HasValue)
        {
            query = query.Where(p => p.CompanyId == companyId.Value);
        }

        var processes = await query.ToListAsync(cancellationToken);
        foreach (var process in processes)
        {
            result.SignaturesChecked++;

            if (process.EvaluationActSignedBy == null ||
                string.IsNullOrWhiteSpace(process.EvaluationActHash) ||
                string.IsNullOrWhiteSpace(process.EvaluationActSignature))
            {
                AddFinding(result, "evaluation_act", nameof(PurchaseProcess), process.Id,
                    "El acta de evaluacion figura firmada pero tiene hash, firma u operador faltante.");
                continue;
            }

            var invitations = await _context.Invitations
                .Include(i => i.Supplier)
                .Where(i => i.PurchaseProcessId == process.Id && i.Status == InvitationStatus.Accepted)
                .ToListAsync(cancellationToken);

            var expectedHash = ComputeEvaluationActHash(process, invitations, process.EvaluationActSignedBy);
            if (!HashesEqual(process.EvaluationActHash, expectedHash))
            {
                AddFinding(result, "evaluation_act", nameof(PurchaseProcess), process.Id,
                    "El hash del acta de evaluacion no coincide con las invitaciones/calificaciones firmadas.",
                    expectedHash,
                    process.EvaluationActHash ?? string.Empty);
            }

            var expectedSignature = ComputeEvaluationActSignature(expectedHash);
            if (!HashesEqual(process.EvaluationActSignature, expectedSignature))
            {
                AddFinding(result, "evaluation_act", nameof(PurchaseProcess), process.Id,
                    "La firma del acta de evaluacion no coincide con el hash firmado.",
                    expectedSignature,
                    process.EvaluationActSignature ?? string.Empty);
            }
        }
    }

    private async Task VerifyAwardHashes(IntegrityVerificationDto result, Guid? companyId, CancellationToken cancellationToken)
    {
        var query = _context.Awards
            .Include(a => a.PurchaseProcess)
            .Include(a => a.Supplier)
            .Include(a => a.DocumentTemplate)
            .Include(a => a.Items)
            .AsQueryable();

        if (companyId.HasValue)
        {
            query = query.Where(a => a.PurchaseProcess.CompanyId == companyId.Value);
        }

        var awards = await query.ToListAsync(cancellationToken);
        foreach (var award in awards)
        {
            result.DocumentsChecked++;

            if (string.IsNullOrWhiteSpace(award.DocumentHash) || string.IsNullOrWhiteSpace(award.ImmutableHash))
            {
                AddFinding(result, "award", nameof(Award), award.Id,
                    "La adjudicacion no tiene hashes documental/inmutable completos.");
                continue;
            }

            if (!string.IsNullOrWhiteSpace(award.DocumentPath) && File.Exists(award.DocumentPath))
            {
                var expectedDocumentHash = AwardIntegrity.CalculateDocumentHash(award.DocumentPath);
                if (!HashesEqual(award.DocumentHash, expectedDocumentHash))
                {
                    AddFinding(result, "award", nameof(Award), award.Id,
                        "El hash del documento de adjudicacion no coincide con el archivo almacenado.",
                        expectedDocumentHash,
                        award.DocumentHash);
                }
            }
            else
            {
                AddFinding(result, "award", nameof(Award), award.Id,
                    "No se encontro el archivo fisico del acta de adjudicacion para verificar su hash.",
                    severity: "medium");
            }

            if (award.DocumentTemplate == null)
            {
                AddFinding(result, "award", nameof(Award), award.Id,
                    "No se encontro la plantilla documental usada para recalcular el hash inmutable.",
                    severity: "medium");
                continue;
            }

            var expectedImmutableHash = AwardIntegrity.CalculateImmutableHash(
                award.PurchaseProcess,
                award,
                award.Supplier,
                award.DocumentTemplate);

            if (!HashesEqual(award.ImmutableHash, expectedImmutableHash))
            {
                AddFinding(result, "award", nameof(Award), award.Id,
                    "El hash inmutable de adjudicacion no coincide con los datos registrados.",
                    expectedImmutableHash,
                    award.ImmutableHash);
            }
        }
    }

    private async Task VerifyContractSignatures(IntegrityVerificationDto result, Guid? companyId, CancellationToken cancellationToken)
    {
        var query = _context.Contracts
            .Where(c => !string.IsNullOrWhiteSpace(c.SignatureHash));

        if (companyId.HasValue)
        {
            query = query.Where(c => c.CompanyId == companyId.Value);
        }

        var contracts = await query.ToListAsync(cancellationToken);
        foreach (var contract in contracts)
        {
            result.SignaturesChecked++;

            if (!contract.SignedAtUtc.HasValue)
            {
                AddFinding(result, "contract_signature", nameof(Contract), contract.Id,
                    "El contrato tiene hash de firma pero no fecha de firma.");
                continue;
            }

            var expectedHash = ComputeContractSignatureHash(contract);
            if (!HashesEqual(contract.SignatureHash, expectedHash))
            {
                AddFinding(result, "contract_signature", nameof(Contract), contract.Id,
                    "La firma/hash del contrato no coincide con numero, monto, terminos y fecha de firma.",
                    expectedHash,
                    contract.SignatureHash ?? string.Empty);
            }
        }
    }

    private static string ComputeAuditEventHash(AuditEvent auditEvent)
    {
        var material = string.Join("|",
            auditEvent.Sequence,
            auditEvent.PreviousHash,
            auditEvent.CompanyId?.ToString() ?? string.Empty,
            auditEvent.EntityName,
            auditEvent.EntityId,
            auditEvent.Action,
            auditEvent.CreatedAtUtc.ToString("O"),
            auditEvent.Payload);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string ComputeBidHash(Bid bid)
    {
        var material = string.Join("|",
            bid.AuctionId,
            bid.Id,
            bid.SupplierId,
            bid.Amount.ToString("0.00", CultureInfo.InvariantCulture),
            bid.PlacedAtUtc.ToString("O", CultureInfo.InvariantCulture),
            bid.SequenceNumber,
            bid.PreviousHash);

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(material));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string ComputeEvaluationActHash(PurchaseProcess process, List<Invitation> invitations, User evaluator)
    {
        var materialBuilder = new StringBuilder();
        materialBuilder.Append("EvaluationAct").Append("|")
            .Append(process.Id).Append("|")
            .Append(process.Code).Append("|")
            .Append(process.Title).Append("|")
            .Append(evaluator.Id).Append("|")
            .Append(evaluator.Email).Append("|");

        foreach (var invitation in invitations.OrderBy(i => i.SupplierId))
        {
            materialBuilder.Append(invitation.SupplierId).Append(",")
                .Append(invitation.QualificationStatus).Append(",")
                .Append(invitation.QualificationNotes ?? "").Append(";");
        }

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(materialBuilder.ToString()));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static string ComputeEvaluationActSignature(string hash)
    {
        var signatureBytes = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(EvaluationActSigningKey),
            Encoding.UTF8.GetBytes(hash));

        return Convert.ToHexString(signatureBytes).ToLowerInvariant();
    }

    private static string ComputeContractSignatureHash(Contract contract)
    {
        var material = $"{contract.Number}:{contract.Amount}:{contract.Terms}:{contract.SignedAtUtc!.Value:O}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(material)));
    }

    private static void AddFinding(
        IntegrityVerificationDto result,
        string scope,
        string entityName,
        Guid entityId,
        string message,
        string expectedHash = "",
        string actualHash = "",
        string severity = "high")
    {
        result.Findings.Add(new IntegrityFindingDto
        {
            Scope = scope,
            EntityName = entityName,
            EntityId = entityId.ToString(),
            Severity = severity,
            Message = message,
            ExpectedHash = expectedHash,
            ActualHash = actualHash
        });
    }

    private static bool HashesEqual(string? left, string? right)
    {
        return string.Equals(left ?? string.Empty, right ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }
}
