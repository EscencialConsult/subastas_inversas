namespace SICST.Infrastructure.Arca;

public class ArcaOptions
{
    public const string SectionName = "Arca";

    public string CertificatePath { get; set; } = string.Empty;
    public string CertificatePassword { get; set; } = string.Empty;
    public string Cuit { get; set; } = string.Empty;
    public string Environment { get; set; } = "homologacion";
    public string PadronVersion { get; set; } = "A5";
    public string WsaaUrl { get; set; } = string.Empty;
    public string PadronA5Url { get; set; } = string.Empty;
    public string PadronA13Url { get; set; } = string.Empty;
    public int TaLifeTimeMinutes { get; set; } = 660;

    public string? WsaaUrlHomologacion { get; set; }
    public string? PadronA5UrlHomologacion { get; set; }
    public string? PadronA13UrlHomologacion { get; set; }

    public string GetEffectiveWsaaUrl() =>
        Environment == "homologacion" && !string.IsNullOrEmpty(WsaaUrlHomologacion)
            ? WsaaUrlHomologacion
            : WsaaUrl;

    public string GetEffectivePadronUrl()
    {
        var isA13 = string.Equals(PadronVersion, "A13", StringComparison.OrdinalIgnoreCase);

        if (Environment == "homologacion")
        {
            return isA13 && !string.IsNullOrEmpty(PadronA13UrlHomologacion)
                ? PadronA13UrlHomologacion
                : PadronA5UrlHomologacion ?? PadronA5Url;
        }

        return isA13 && !string.IsNullOrEmpty(PadronA13Url)
            ? PadronA13Url
            : PadronA5Url;
    }

    public string GetEffectivePadronService() =>
        string.Equals(PadronVersion, "A13", StringComparison.OrdinalIgnoreCase)
            ? "ws_sr_padron_a13"
            : "ws_sr_padron_a5";

    public long GetRepresentedCuit()
    {
        var digits = new string(Cuit.Where(char.IsDigit).ToArray());
        return long.TryParse(digits, out var value) ? value : 0;
    }
}
