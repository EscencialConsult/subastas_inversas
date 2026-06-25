namespace SICST.Application.Auth.DTOs;

public class MfaSetupDto
{
    public string Secret { get; set; } = string.Empty;
    public string OtpAuthUri { get; set; } = string.Empty;
}
