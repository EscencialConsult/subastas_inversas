using System.Security.Cryptography;
using SICST.Api.Services;

namespace SICST.Tests.Security;

public class PdfUploadSecurityTests
{
    [Fact]
    public async Task ValidatePdfMagicBytesAsync_ShouldAcceptPdfHeader()
    {
        await using var stream = new MemoryStream("%PDF-1.7 test"u8.ToArray());

        await PdfUploadSecurity.ValidatePdfMagicBytesAsync(stream, CancellationToken.None);

        Assert.Equal(0, stream.Position);
    }

    [Fact]
    public async Task ValidatePdfMagicBytesAsync_ShouldRejectNonPdfHeader()
    {
        await using var stream = new MemoryStream("not-a-pdf"u8.ToArray());

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            PdfUploadSecurity.ValidatePdfMagicBytesAsync(stream, CancellationToken.None));
    }

    [Fact]
    public async Task CopyToAndHashAsync_ShouldCopyByStreamAndReturnSha256()
    {
        var payload = "%PDF-1.7\ncontenido"u8.ToArray();
        await using var source = new MemoryStream(payload);
        await using var destination = new MemoryStream();

        var hash = await PdfUploadSecurity.CopyToAndHashAsync(source, destination, CancellationToken.None);

        Assert.Equal(payload, destination.ToArray());
        Assert.Equal(Convert.ToHexString(SHA256.HashData(payload)).ToLowerInvariant(), hash);
    }
}
