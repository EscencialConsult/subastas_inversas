namespace SICST.Application.Modules.Audit.DTOs;

public class SignedAuditCsvExportDto
{
    public string FileName { get; set; } = string.Empty;
    public DateTime GeneratedAtUtc { get; set; }
    public string CsvContent { get; set; } = string.Empty;
    public string Sha256Hash { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
    public string SignatureAlgorithm { get; set; } = "HMAC-SHA256";
}
