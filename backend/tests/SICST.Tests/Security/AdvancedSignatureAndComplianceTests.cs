using SICST.Application.Common.Interfaces;
using SICST.Infrastructure.Services;
using Xunit;

namespace SICST.Tests.Security;

public class AdvancedSignatureTests
{
    [Fact]
    public async Task AdvancedSignature_ShouldProducePkcs7X509DetachedEnvelope()
    {
        var service = new LocalAdvancedDigitalSignatureService();
        var payload = "contrato|CONT-1|120000.00";

        var signature = await service.SignAsync(
            new AdvancedSignatureRequest(
                "contract",
                Guid.NewGuid(),
                Guid.NewGuid(),
                "firmante@sicst.test",
                payload),
            CancellationToken.None);

        Assert.Equal("PKCS#7/X.509 detached", signature.Format);
        Assert.Equal("SHA256withRSA", signature.Algorithm);
        Assert.Contains("CN=SICST Firma Digital Avanzada", signature.CertificateSubject);
        Assert.False(string.IsNullOrWhiteSpace(signature.CertificateSerialNumber));
        Assert.False(string.IsNullOrWhiteSpace(signature.Pkcs7SignatureBase64));
        Assert.True(await service.VerifyAsync(payload, signature, CancellationToken.None));
        Assert.False(await service.VerifyAsync(payload + "|alterado", signature, CancellationToken.None));
    }

}
