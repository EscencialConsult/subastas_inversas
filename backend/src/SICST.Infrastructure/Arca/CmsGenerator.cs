using System.Globalization;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Options;

namespace SICST.Infrastructure.Arca;

public class CmsGenerator
{
    private readonly ArcaOptions _options;
    private X509Certificate2? _certificate;
    private readonly object _lock = new();

    public CmsGenerator(IOptions<ArcaOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateLoginCms(string service)
    {
        var cert = GetCertificate();
        var xml = BuildLoginTicketRequestXml(service);
        var xmlBytes = Encoding.UTF8.GetBytes(xml);

        var contentInfo = new ContentInfo(xmlBytes);
        var signedCms = new SignedCms(contentInfo, false);

        var signer = new CmsSigner(SubjectIdentifierType.IssuerAndSerialNumber, cert);
        signedCms.ComputeSignature(signer);

        var encoded = signedCms.Encode();
        return Convert.ToBase64String(encoded);
    }

    private X509Certificate2 GetCertificate()
    {
        if (_certificate is not null)
            return _certificate;

        lock (_lock)
        {
            if (_certificate is not null)
                return _certificate;

            // En Render no hay disco para el .pfx: si viene el certificado en base64
            // (variable de entorno), lo usamos; si no, lo leemos del archivo (dev local).
            var rawData = !string.IsNullOrWhiteSpace(_options.CertificateBase64)
                ? Convert.FromBase64String(_options.CertificateBase64.Trim())
                : File.ReadAllBytes(_options.CertificatePath);

            _certificate = string.IsNullOrEmpty(_options.CertificatePassword)
                ? X509CertificateLoader.LoadCertificate(rawData)
                : LoadCertificateWithPassword(rawData, _options.CertificatePassword);
        }

        return _certificate;
    }

    private static string BuildLoginTicketRequestXml(string service)
    {
        var now = DateTimeOffset.UtcNow;
        var generationTime = FormatArgentinaTime(now.AddMinutes(-10));
        var expirationTime = FormatArgentinaTime(now.AddHours(12));
        var uniqueId = now.ToUnixTimeSeconds();

        var doc = new XDocument(
            new XElement("loginTicketRequest",
                new XAttribute("version", "1.0"),
                new XElement("header",
                    new XElement("uniqueId", uniqueId),
                    new XElement("generationTime", generationTime),
                    new XElement("expirationTime", expirationTime)),
                new XElement("service", service)));

        return doc.ToString(SaveOptions.DisableFormatting);
    }

    private static X509Certificate2 LoadCertificateWithPassword(byte[] rawData, string password)
    {
#pragma warning disable SYSLIB0057
        return new X509Certificate2(rawData, password);
#pragma warning restore SYSLIB0057
    }

    private static string FormatArgentinaTime(DateTimeOffset utc)
    {
        var local = utc.ToOffset(TimeSpan.FromHours(-3));
        return local.ToString("yyyy-MM-ddTHH:mm:sszzz", CultureInfo.InvariantCulture);
    }
}
