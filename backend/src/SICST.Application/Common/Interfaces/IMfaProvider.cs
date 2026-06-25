namespace SICST.Application.Common.Interfaces;

public interface IMfaProvider
{
    string GenerateSecret();
    string GetTotpUri(string issuer, string accountName, string secret);
    bool VerifyCode(string secret, string code);
}
