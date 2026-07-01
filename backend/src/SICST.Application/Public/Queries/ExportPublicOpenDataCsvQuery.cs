using System.Globalization;
using System.Text;
using MediatR;
using SICST.Application.Public.DTOs;

namespace SICST.Application.Public.Queries;

public record ExportPublicOpenDataCsvQuery(Guid? CompanyId = null, string? Stage = null) : IRequest<PublicOpenDataCsvExportDto>;

public class ExportPublicOpenDataCsvQueryHandler
    : IRequestHandler<ExportPublicOpenDataCsvQuery, PublicOpenDataCsvExportDto>
{
    private readonly ISender _sender;

    public ExportPublicOpenDataCsvQueryHandler(ISender sender)
    {
        _sender = sender;
    }

    public async Task<PublicOpenDataCsvExportDto> Handle(
        ExportPublicOpenDataCsvQuery request,
        CancellationToken cancellationToken)
    {
        var package = await _sender.Send(
            new GetPublicOcdsReleasesQuery(request.CompanyId, request.Stage),
            cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("ocid;releaseId;etapas;organismo;codigoProceso;titulo;estado;presupuesto;subastaId;lances;adjudicatario;montoAdjudicado;contratos;pagos");

        foreach (var release in package.Releases)
        {
            var award = release.Awards.FirstOrDefault();
            csv.Append(Escape(release.Ocid)).Append(';')
                .Append(Escape(release.Id)).Append(';')
                .Append(Escape(string.Join(",", release.Tag))).Append(';')
                .Append(Escape(release.Buyer.Name)).Append(';')
                .Append(Escape(release.Tender.Id)).Append(';')
                .Append(Escape(release.Tender.Title)).Append(';')
                .Append(Escape(release.Tender.Status)).Append(';')
                .Append(FormatDecimal(release.Tender.ValueAmount)).Append(';')
                .Append(Escape(release.Tender.Auction?.Id ?? string.Empty)).Append(';')
                .Append(release.Tender.Auction?.BidCount ?? 0).Append(';')
                .Append(Escape(award?.Supplier.Name ?? string.Empty)).Append(';')
                .Append(FormatDecimal(award?.ValueAmount ?? 0)).Append(';')
                .Append(release.Contracts.Count).Append(';')
                .Append(FormatDecimal(release.Implementation.Transactions.Sum(t => t.ValueAmount)))
                .AppendLine();
        }

        return new PublicOpenDataCsvExportDto
        {
            FileName = $"sicst-datos-abiertos-{DateTime.UtcNow:yyyyMMddHHmmss}.csv",
            CsvContent = csv.ToString()
        };
    }

    private static string FormatDecimal(decimal value)
    {
        return value.ToString("0.##", CultureInfo.InvariantCulture);
    }

    private static string Escape(string value)
    {
        var safe = value.Replace("\"", "\"\"");
        return safe.Contains(';') || safe.Contains('"') || safe.Contains('\n')
            ? $"\"{safe}\""
            : safe;
    }
}
