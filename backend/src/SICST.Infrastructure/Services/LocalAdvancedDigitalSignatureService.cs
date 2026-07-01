using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Services;

public class LocalAdvancedDigitalSignatureService : IAdvancedDigitalSignatureService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly Lazy<X509Certificate2> Certificate = new(CreateCertificate);

    public Task<AdvancedSignatureResult> SignAsync(
        AdvancedSignatureRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var payloadBytes = Encoding.UTF8.GetBytes(request.Payload);
        var contentHash = Convert.ToHexString(SHA256.HashData(payloadBytes)).ToLowerInvariant();
        var signedAt = DateTime.UtcNow;

        using var rsa = Certificate.Value.GetRSAPrivateKey()
            ?? throw new InvalidOperationException("El certificado X.509 no tiene clave privada.");
        var signature = rsa.SignData(payloadBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var envelope = new
        {
            format = "PKCS#7",
            detached = true,
            contentHash,
            documentType = request.DocumentType,
            entityId = request.EntityId,
            signerId = request.SignerId,
            signerEmail = request.SignerEmail,
            signedAtUtc = signedAt,
            algorithm = "SHA256withRSA",
            certificateSubject = Certificate.Value.Subject,
            certificateSerialNumber = Certificate.Value.SerialNumber,
            certificateDerBase64 = Convert.ToBase64String(Certificate.Value.Export(X509ContentType.Cert)),
            signatureValueBase64 = Convert.ToBase64String(signature)
        };

        var pkcs7Envelope = Convert.ToBase64String(
            Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope, JsonOptions)));

        return Task.FromResult(new AdvancedSignatureResult(
            contentHash,
            pkcs7Envelope,
            Certificate.Value.Subject,
            Certificate.Value.SerialNumber,
            signedAt,
            "SHA256withRSA",
            "PKCS#7/X.509 detached"));
    }

    public Task<bool> VerifyAsync(
        string payload,
        AdvancedSignatureResult signature,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var contentHash = Convert.ToHexString(SHA256.HashData(payloadBytes)).ToLowerInvariant();
        if (!string.Equals(contentHash, signature.ContentHash, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(false);
        }

        try
        {
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(signature.Pkcs7SignatureBase64));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var certificateBytes = Convert.FromBase64String(root.GetProperty("certificateDerBase64").GetString() ?? string.Empty);
            var signatureBytes = Convert.FromBase64String(root.GetProperty("signatureValueBase64").GetString() ?? string.Empty);
            using var certificate = X509CertificateLoader.LoadCertificate(certificateBytes);
            using var rsa = certificate.GetRSAPublicKey();
            return Task.FromResult(rsa != null &&
                rsa.VerifyData(payloadBytes, signatureBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    private static X509Certificate2 CreateCertificate()
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest(
            "CN=SICST Firma Digital Avanzada,O=SICST",
            rsa,
            HashAlgorithmName.SHA256,
            RSASignaturePadding.Pkcs1);

        request.CertificateExtensions.Add(
            new X509KeyUsageExtension(
                X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.NonRepudiation,
                critical: true));

        return request.CreateSelfSigned(
            DateTimeOffset.UtcNow.AddDays(-1),
            DateTimeOffset.UtcNow.AddYears(5));
    }
}
