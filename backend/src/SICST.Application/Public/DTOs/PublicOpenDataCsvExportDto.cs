namespace SICST.Application.Public.DTOs;

public class PublicOpenDataCsvExportDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "text/csv; charset=utf-8";
    public string CsvContent { get; set; } = string.Empty;
}
