using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Storage;

/// <summary>
/// Almacenamiento en disco local. Se usa en desarrollo (tu máquina). En producción se usa
/// SupabaseFileStorage, porque el disco de Render es efímero.
/// </summary>
public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _basePath;

    public LocalFileStorage(string basePath)
    {
        _basePath = Path.GetFullPath(basePath);
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken)
    {
        var fullPath = ResolvePath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var file = File.Create(fullPath);
        await content.CopyToAsync(file, cancellationToken);
        return NormalizeKey(key);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        var fullPath = ResolvePath(key);
        if (!File.Exists(fullPath))
        {
            return Task.FromResult<Stream?>(null);
        }

        Stream stream = File.OpenRead(fullPath);
        return Task.FromResult<Stream?>(stream);
    }

    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken)
        => Task.FromResult(File.Exists(ResolvePath(key)));

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        var fullPath = ResolvePath(key);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        return Task.CompletedTask;
    }

    private string ResolvePath(string key)
    {
        var normalized = NormalizeKey(key);
        var fullPath = Path.GetFullPath(Path.Combine(_basePath, normalized));

        // Anti path-traversal: la ruta resuelta nunca puede salir de la carpeta base.
        if (!fullPath.StartsWith(_basePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("La ruta de almacenamiento no es valida.");
        }

        return fullPath;
    }

    private static string NormalizeKey(string key) => key.Replace('\\', '/').TrimStart('/');
}
