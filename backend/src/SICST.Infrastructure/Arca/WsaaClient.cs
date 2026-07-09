using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SICST.Infrastructure.Arca;

public class WsaaClient
{
    private static readonly XNamespace SoapEnv = "http://schemas.xmlsoap.org/soap/envelope/";
    private static readonly XNamespace WsaaNs = "http://wsaa.view.sua.dvadac.desein.afip.gov.ar";

    private readonly HttpClient _httpClient;
    private readonly CmsGenerator _cmsGenerator;
    private readonly ArcaOptions _options;
    private readonly ILogger<WsaaClient> _logger;

    public WsaaClient(
        HttpClient httpClient,
        CmsGenerator cmsGenerator,
        IOptions<ArcaOptions> options,
        ILogger<WsaaClient> logger)
    {
        _httpClient = httpClient;
        _cmsGenerator = cmsGenerator;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<(string token, string sign)> LoginAsync(string service, CancellationToken ct)
    {
        var cms = _cmsGenerator.GenerateLoginCms(service);
        var soapRequest = BuildSoapEnvelope(cms);

        using var content = new StringContent(soapRequest, Encoding.UTF8, "text/xml");
        content.Headers.Add("SOAPAction", "");

        var url = _options.GetEffectiveWsaaUrl();
        _logger.LogDebug("Sending WSAA login request to {Url}", url);

        using var response = await _httpClient.PostAsync(url, content, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var fault = ExtractSoapFault(responseBody);
            _logger.LogError(
                "WSAA returned {StatusCode} for service {Service}. Response body: {Body}",
                response.StatusCode, service, responseBody);
            throw new InvalidOperationException($"ARCA WSAA rechazó la autenticación: {fault}");
        }

        return ParseLoginResponse(responseBody);
    }

    private static string BuildSoapEnvelope(string cms)
    {
        var doc = new XDocument(
            new XElement(SoapEnv + "Envelope",
                new XAttribute(XNamespace.Xmlns + "soap", SoapEnv),
                new XAttribute(XNamespace.Xmlns + "xsi", "http://www.w3.org/2001/XMLSchema-instance"),
                new XAttribute(XNamespace.Xmlns + "xsd", "http://www.w3.org/2001/XMLSchema"),
                new XElement(SoapEnv + "Body",
                    new XElement(WsaaNs + "loginCms",
                        new XElement("in0", cms)))));

        return doc.ToString(SaveOptions.DisableFormatting);
    }

    private static (string token, string sign) ParseLoginResponse(string soapXml)
    {
        var doc = XDocument.Parse(soapXml);

        var loginCmsReturn = doc
            .Descendants(WsaaNs + "loginCmsReturn")
            .FirstOrDefault()
            ?.Value;

        if (string.IsNullOrEmpty(loginCmsReturn))
            throw new InvalidOperationException("WSAA response did not contain loginCmsReturn.");

        var taXml = loginCmsReturn.TrimStart().StartsWith("<", StringComparison.Ordinal)
            ? loginCmsReturn
            : Encoding.UTF8.GetString(Convert.FromBase64String(loginCmsReturn));

        var taDoc = XDocument.Parse(taXml);

        var token = taDoc
            .Descendants("token")
            .FirstOrDefault()
            ?.Value;

        var sign = taDoc
            .Descendants("sign")
            .FirstOrDefault()
            ?.Value;

        if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(sign))
            throw new InvalidOperationException("WSAA ticket did not contain token or sign.");

        return (token, sign);
    }

    private static string ExtractSoapFault(string soapXml)
    {
        try
        {
            var doc = XDocument.Parse(soapXml);
            var faultString = doc
                .Descendants(SoapEnv + "Fault")
                .Elements("faultstring")
                .FirstOrDefault()
                ?.Value;

            if (!string.IsNullOrWhiteSpace(faultString))
            {
                return faultString.Trim();
            }
        }
        catch
        {
            // The raw status is still enough for the caller if ARCA returns non-XML.
        }

        return "respuesta no exitosa del servicio de autenticación.";
    }
}
