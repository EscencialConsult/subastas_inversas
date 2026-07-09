namespace SICST.Infrastructure.Arca;

public class TicketAcceso
{
    public string Token { get; init; } = string.Empty;
    public string Sign { get; init; } = string.Empty;
    public DateTime ExpirationUtc { get; init; }

    public bool IsExpired => DateTime.UtcNow >= ExpirationUtc;
}
