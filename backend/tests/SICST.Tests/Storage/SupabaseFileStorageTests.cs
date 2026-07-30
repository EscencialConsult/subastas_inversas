using System.Net;
using Microsoft.Extensions.Options;
using SICST.Infrastructure.Storage;
using Xunit;

namespace SICST.Tests.Storage;

public class SupabaseFileStorageTests
{
    private sealed class StubHandler : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest;
        public HttpResponseMessage Response = new(HttpStatusCode.OK);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(Response);
        }
    }

    private static SupabaseFileStorage Create(StubHandler handler)
    {
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://proj.supabase.co/") };
        var options = Options.Create(new SupabaseStorageOptions { Bucket = "documentos" });
        return new SupabaseFileStorage(http, options);
    }

    [Fact]
    public async Task Save_PostsToObjectPath_WithUpsert()
    {
        var handler = new StubHandler();
        var storage = Create(handler);

        await storage.SaveAsync("suppliers/1/x.pdf", new MemoryStream([1, 2]), "application/pdf", CancellationToken.None);

        Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
        Assert.Equal(
            "https://proj.supabase.co/storage/v1/object/documentos/suppliers/1/x.pdf",
            handler.LastRequest.RequestUri!.ToString());
        Assert.True(handler.LastRequest.Headers.Contains("x-upsert"));
    }

    [Fact]
    public async Task OpenRead_ReturnsNull_On404()
    {
        var handler = new StubHandler { Response = new HttpResponseMessage(HttpStatusCode.NotFound) };
        var storage = Create(handler);

        var stream = await storage.OpenReadAsync("x.pdf", CancellationToken.None);

        Assert.Null(stream);
    }

    [Fact]
    public async Task OpenRead_ReturnsContent_On200()
    {
        var handler = new StubHandler
        {
            Response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent([9, 8, 7]),
            },
        };
        var storage = Create(handler);

        await using var stream = await storage.OpenReadAsync("x.pdf", CancellationToken.None);

        Assert.NotNull(stream);
        using var ms = new MemoryStream();
        await stream!.CopyToAsync(ms);
        Assert.Equal([9, 8, 7], ms.ToArray());
    }
}
