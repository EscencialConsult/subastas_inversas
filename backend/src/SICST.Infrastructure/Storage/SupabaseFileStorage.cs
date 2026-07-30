using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Storage;

/// <summary>
/// Almacenamiento en Supabase Storage (producción). Usa la API REST de Storage.
/// El HttpClient (BaseAddress + credenciales) se configura en el registro de DI.
/// </summary>
public sealed class SupabaseFileStorage : IFileStorage
{
    private readonly HttpClient _http;
    private readonly string _bucket;

    public SupabaseFileStorage(HttpClient http, IOptions<SupabaseStorageOptions> options)
    {
        _http = http;
        _bucket = options.Value.Bucket;
    }

    public async Task<string> SaveAsync(string key, Stream content, string contentType, CancellationToken cancellationToken)
    {
        var normalized = NormalizeKey(key);

        using var streamContent = new StreamContent(content);
        streamContent.Headers.ContentType = new MediaTypeHeaderValue(
            string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType);

        using var request = new HttpRequestMessage(HttpMethod.Post, ObjectPath(normalized))
        {
            Content = streamContent,
        };
        request.Headers.Add("x-upsert", "true"); // sobrescribe si ya existiera esa key

        using var response = await _http.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return normalized;
    }

    public async Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        using var response = await _http.GetAsync(ObjectPath(NormalizeKey(key)), cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        // Buffer en memoria: los documentos son PDFs chicos (<= 10 MB). Evita problemas de
        // disposición del HttpResponseMessage al devolver el stream al llamador.
        var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
        return new MemoryStream(bytes);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Head, ObjectPath(NormalizeKey(key)));
        using var response = await _http.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        using var response = await _http.DeleteAsync(ObjectPath(NormalizeKey(key)), cancellationToken);
        if (response.StatusCode != HttpStatusCode.NotFound)
        {
            response.EnsureSuccessStatusCode();
        }
    }

    private string ObjectPath(string key) => $"storage/v1/object/{_bucket}/{key}";

    private static string NormalizeKey(string key) => key.Replace('\\', '/').TrimStart('/');
}
