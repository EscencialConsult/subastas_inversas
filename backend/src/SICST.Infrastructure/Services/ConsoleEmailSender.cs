using Microsoft.Extensions.Logging;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Services;

public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;

    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Email enviado a {To}. Asunto: {Subject}. Cuerpo: {Body}", to, subject, body);
        return Task.CompletedTask;
    }
}
