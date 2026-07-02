using System.Security.Cryptography;
using System.Text;

namespace SICST.Application.Modules.Identity.Auth.Commands;

public static class RefreshTokenHelper
{
    public static string Generate()
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    public static string Hash(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
