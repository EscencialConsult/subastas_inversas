using System.Text;
using SICST.Infrastructure.Storage;
using Xunit;

namespace SICST.Tests.Storage;

public class LocalFileStorageTests : IDisposable
{
    private readonly string _baseDir;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _baseDir = Path.Combine(Path.GetTempPath(), "sicst-storage-tests", Guid.NewGuid().ToString("N"));
        _storage = new LocalFileStorage(_baseDir);
    }

    [Fact]
    public async Task Save_Then_Read_ReturnsSameContent()
    {
        var key = "suppliers/abc/doc.pdf";
        var content = Encoding.UTF8.GetBytes("hola-pdf");

        await _storage.SaveAsync(key, new MemoryStream(content), "application/pdf", CancellationToken.None);

        Assert.True(await _storage.ExistsAsync(key, CancellationToken.None));
        await using var stream = await _storage.OpenReadAsync(key, CancellationToken.None);
        Assert.NotNull(stream);
        using var ms = new MemoryStream();
        await stream!.CopyToAsync(ms);
        Assert.Equal(content, ms.ToArray());
    }

    [Fact]
    public async Task OpenRead_ReturnsNull_WhenNotFound()
    {
        var stream = await _storage.OpenReadAsync("no/existe.pdf", CancellationToken.None);
        Assert.Null(stream);
    }

    [Fact]
    public async Task Delete_RemovesFile()
    {
        var key = "x/y.pdf";
        await _storage.SaveAsync(key, new MemoryStream([1, 2, 3]), "application/pdf", CancellationToken.None);

        await _storage.DeleteAsync(key, CancellationToken.None);

        Assert.False(await _storage.ExistsAsync(key, CancellationToken.None));
    }

    [Fact]
    public async Task Save_Throws_OnPathTraversal()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _storage.SaveAsync("../../escape.pdf", new MemoryStream([1]), "application/pdf", CancellationToken.None));
    }

    public void Dispose()
    {
        GC.SuppressFinalize(this);
        try
        {
            if (Directory.Exists(_baseDir))
            {
                Directory.Delete(_baseDir, true);
            }
        }
        catch
        {
            // limpieza best-effort
        }
    }
}
