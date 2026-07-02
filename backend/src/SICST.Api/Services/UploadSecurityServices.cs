using System.Buffers;
using System.Security.Cryptography;

namespace SICST.Api.Services;

public record StoredUpload(string RelativePath, string FullPath, string Sha256Hash);

public record AntivirusScanResult(bool IsClean, string? Message = null);

public interface IUploadStorage
{
    Task<StoredUpload> SaveAsync(Stream source, string relativePath, CancellationToken cancellationToken);
}

public interface IAntivirusScanner
{
    Task<AntivirusScanResult> ScanAsync(string fullPath, CancellationToken cancellationToken);
}

public sealed class LocalUploadStorage : IUploadStorage
{
    private readonly IWebHostEnvironment _environment;

    public LocalUploadStorage(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<StoredUpload> SaveAsync(Stream source, string relativePath, CancellationToken cancellationToken)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, relativePath));
        var rootPath = Path.GetFullPath(_environment.ContentRootPath);
        if (!fullPath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("La ruta de almacenamiento no es valida.");
        }

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var destination = File.Create(fullPath);
        var hash = await PdfUploadSecurity.CopyToAndHashAsync(source, destination, cancellationToken);
        return new StoredUpload(relativePath, fullPath, hash);
    }
}

public sealed class NoOpAntivirusScanner : IAntivirusScanner
{
    public Task<AntivirusScanResult> ScanAsync(string fullPath, CancellationToken cancellationToken)
    {
        return Task.FromResult(new AntivirusScanResult(true));
    }
}

public static class PdfUploadSecurity
{
    private static readonly byte[] PdfMagicBytes = "%PDF-"u8.ToArray();

    public static async Task ValidatePdfMagicBytesAsync(Stream stream, CancellationToken cancellationToken)
    {
        if (!stream.CanSeek)
        {
            throw new InvalidOperationException("El stream del archivo debe permitir lectura posicionable.");
        }

        var header = new byte[PdfMagicBytes.Length];
        var bytesRead = await stream.ReadAsync(header, cancellationToken);
        stream.Position = 0;

        if (bytesRead != PdfMagicBytes.Length || !header.SequenceEqual(PdfMagicBytes))
        {
            throw new InvalidOperationException("El archivo no contiene una cabecera PDF valida.");
        }
    }

    public static async Task<string> CopyToAndHashAsync(Stream source, Stream destination, CancellationToken cancellationToken)
    {
        using var sha256 = SHA256.Create();
        var buffer = ArrayPool<byte>.Shared.Rent(81920);

        try
        {
            int bytesRead;
            while ((bytesRead = await source.ReadAsync(buffer.AsMemory(0, buffer.Length), cancellationToken)) > 0)
            {
                await destination.WriteAsync(buffer.AsMemory(0, bytesRead), cancellationToken);
                sha256.TransformBlock(buffer, 0, bytesRead, null, 0);
            }

            sha256.TransformFinalBlock([], 0, 0);
            return Convert.ToHexString(sha256.Hash!).ToLowerInvariant();
        }
        finally
        {
            CryptographicOperations.ZeroMemory(buffer.AsSpan());
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }
}
