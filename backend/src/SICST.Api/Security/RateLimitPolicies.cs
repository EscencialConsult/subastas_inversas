namespace SICST.Api.Security;

public static class RateLimitPolicies
{
    public const string Login = "auth-login";
    public const string Mfa = "auth-mfa";
    public const string RefreshToken = "auth-refresh";
}
