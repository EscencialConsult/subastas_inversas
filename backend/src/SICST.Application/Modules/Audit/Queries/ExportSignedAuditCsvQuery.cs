using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Modules.Audit.DTOs;
using SICST.Application.Common.Interfaces;

namespace SICST.Application.Modules.Audit.Queries;

public record ExportSignedAuditCsvQuery(Guid? CompanyId = null) : IRequest<SignedAuditCsvExportDto>;

public class ExportSignedAuditCsvQueryHandler : IRequestHandler<ExportSignedAuditCsvQuery, SignedAuditCsvExportDto>
{
    private const string SigningKey = "SICST_Audit_Csv_Signing_Secret_Key_2026";

    private readonly IApplicationDbContext _context;

    public ExportSignedAuditCsvQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SignedAuditCsvExportDto> Handle(ExportSignedAuditCsvQuery request, CancellationToken cancellationToken)
    {
        var generatedAt = DateTime.UtcNow;
        var dashboard = await new GetRiskDashboardQueryHandler(_context)
            .Handle(new GetRiskDashboardQuery(request.CompanyId), cancellationToken);
        var alerts = await new GetRiskAlertsQueryHandler(_context)
            .Handle(new GetRiskAlertsQuery(request.CompanyId, Limit: 1000), cancellationToken);
        var integrity = await new VerifyIntegrityQueryHandler(_context)
            .Handle(new VerifyIntegrityQuery(request.CompanyId), cancellationToken);

        var processQuery = _context.PurchaseProcesses
            .Include(p => p.Awards).ThenInclude(a => a.Supplier)
            .AsQueryable();

        if (request.CompanyId.HasValue)
        {
            processQuery = processQuery.Where(p => p.CompanyId == request.CompanyId.Value);
        }

        var processes = await processQuery
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(1000)
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        AppendRow(csv, "Reporte de auditoria SICST");
        AppendRow(csv, "Generado UTC", generatedAt.ToString("O", CultureInfo.InvariantCulture));
        AppendRow(csv, "Empresa", request.CompanyId?.ToString() ?? "todas");
        AppendRow(csv);

        AppendRow(csv, "Panel de riesgo");
        AppendRow(csv, "Procesos", "Subastas", "Alertas", "Altas", "Medias", "Informativas", "Procesos con alerta", "Integridad", "Hallazgos integridad");
        AppendRow(csv,
            dashboard.TotalProcesses,
            dashboard.TotalAuctions,
            dashboard.TotalAlerts,
            dashboard.HighRiskAlerts,
            dashboard.MediumRiskAlerts,
            dashboard.InfoRiskAlerts,
            dashboard.ProcessesWithAlerts,
            dashboard.IntegrityIsValid ? "Integra" : "Con hallazgos",
            dashboard.IntegrityFindings);
        AppendRow(csv);

        AppendRow(csv, "Procesos");
        AppendRow(csv, "Codigo", "Titulo", "Estado", "Adjudicado a", "Monto adjudicado", "Creado UTC");
        foreach (var process in processes)
        {
            var firstAward = process.Awards.OrderBy(a => a.AdjudicatedAtUtc).FirstOrDefault();
            AppendRow(csv,
                process.Code,
                process.Title,
                process.Status,
                firstAward?.Supplier?.BusinessName ?? string.Empty,
                firstAward?.Amount.ToString("0.00", CultureInfo.InvariantCulture) ?? string.Empty,
                process.CreatedAtUtc.ToString("O", CultureInfo.InvariantCulture));
        }
        AppendRow(csv);

        AppendRow(csv, "Alertas de riesgo");
        AppendRow(csv, "Severidad", "Proceso", "Titulo", "Codigo alerta", "Mensaje", "Metrica", "Detectada UTC");
        foreach (var alert in alerts)
        {
            AppendRow(csv,
                alert.Severity,
                alert.ProcessCode,
                alert.ProcessTitle,
                alert.Code,
                alert.Message,
                alert.MetricValue.HasValue ? $"{alert.MetricValue:0.##} {alert.MetricUnit}".Trim() : string.Empty,
                alert.DetectedAtUtc.ToString("O", CultureInfo.InvariantCulture));
        }
        AppendRow(csv);

        AppendRow(csv, "Hallazgos de integridad");
        AppendRow(csv, "Severidad", "Alcance", "Entidad", "EntidadId", "Mensaje", "Hash esperado", "Hash actual");
        foreach (var finding in integrity.Findings)
        {
            AppendRow(csv,
                finding.Severity,
                finding.Scope,
                finding.EntityName,
                finding.EntityId,
                finding.Message,
                finding.ExpectedHash,
                finding.ActualHash);
        }

        csv.AppendLine();
        var body = csv.ToString();
        var hash = ComputeSha256(body);
        var signature = SignHash(hash);
        AppendRow(csv, "Firma digital del reporte");
        AppendRow(csv, "SHA256", hash);
        AppendRow(csv, "Algoritmo", "HMAC-SHA256");
        AppendRow(csv, "Firma", signature);

        return new SignedAuditCsvExportDto
        {
            FileName = $"auditoria-firmada-{generatedAt:yyyyMMddHHmmss}.csv",
            GeneratedAtUtc = generatedAt,
            CsvContent = csv.ToString(),
            Sha256Hash = hash,
            Signature = signature
        };
    }

    private static string ComputeSha256(string content)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content))).ToLowerInvariant();
    }

    private static string SignHash(string hash)
    {
        var signatureBytes = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(SigningKey),
            Encoding.UTF8.GetBytes(hash));

        return Convert.ToHexString(signatureBytes).ToLowerInvariant();
    }

    private static void AppendRow(StringBuilder csv, params object?[] values)
    {
        csv.AppendLine(string.Join(";", values.Select(Escape)));
    }

    private static string Escape(object? value)
    {
        var text = value?.ToString() ?? string.Empty;
        return text.Contains(';') || text.Contains('"') || text.Contains('\n') || text.Contains('\r')
            ? $"\"{text.Replace("\"", "\"\"")}\""
            : text;
    }
}
