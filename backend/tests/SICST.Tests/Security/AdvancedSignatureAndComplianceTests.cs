using SICST.Application.Common.Interfaces;
using SICST.Infrastructure.Services;
using Xunit;

namespace SICST.Tests.Security;

public class AdvancedSignatureAndComplianceTests
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

    [Fact]
    public async Task ExternalComplianceServices_ShouldValidateDgrAndRepsal()
    {
        var dgr = new MockDgrTaxComplianceService();
        var repsal = new MockRepsalComplianceService();

        var valid = new ExternalComplianceRequest(
            "30-11111111-1",
            "Proveedor Limpio",
            "Cordoba",
            "Cordoba");
        var dgrRejected = new ExternalComplianceRequest(
            "30-11111111-9",
            "Proveedor Con Deuda",
            "Cordoba",
            "Cordoba");
        var repsalRejected = new ExternalComplianceRequest(
            "30-11111111-7",
            "Proveedor REPSAL",
            "Cordoba",
            "Cordoba");

        Assert.True((await dgr.VerifyAsync(valid, CancellationToken.None)).Verified);
        Assert.True((await repsal.VerifyAsync(valid, CancellationToken.None)).Verified);
        Assert.False((await dgr.VerifyAsync(dgrRejected, CancellationToken.None)).Verified);
        Assert.False((await repsal.VerifyAsync(repsalRejected, CancellationToken.None)).Verified);
    }
}
