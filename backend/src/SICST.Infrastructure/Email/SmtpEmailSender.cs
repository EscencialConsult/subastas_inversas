using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using SICST.Application.Common.Interfaces;

namespace SICST.Infrastructure.Email;

public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        var bodyHtml = BuildHtmlBody(body);
        var builder = new BodyBuilder
        {
            TextBody = body,
            HtmlBody = bodyHtml
        };

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();

        if (_options.UseSsl)
        {
            await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, MailKit.Security.SecureSocketOptions.SslOnConnect, cancellationToken);
        }
        else
        {
            await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, MailKit.Security.SecureSocketOptions.StartTlsWhenAvailable, cancellationToken);
        }

        if (!string.IsNullOrWhiteSpace(_options.SmtpUsername))
        {
            await client.AuthenticateAsync(_options.SmtpUsername, _options.SmtpPassword, cancellationToken);
        }

        _logger.LogInformation("Enviando email a {To}. Asunto: {Subject}", to, subject);

        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);

        _logger.LogInformation("Email enviado exitosamente a {To}", to);
    }

    private static string BuildHtmlBody(string textBody)
    {
        var paragraphs = textBody
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\n", "<br>");

        return
            "<html>" +
            "<head>" +
            "<meta charset=\"utf-8\">" +
            "<style>" +
            "body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.5;}" +
            ".container{max-width:600px;margin:0 auto;padding:20px;}" +
            ".header{background-color:#005a9c;color:white;padding:15px 20px;border-radius:4px 4px 0 0;}" +
            ".header h1{margin:0;font-size:18px;}" +
            ".content{padding:20px;background-color:#f9f9f9;border:1px solid #ddd;}" +
            ".footer{margin-top:20px;font-size:12px;color:#888;text-align:center;}" +
            "</style>" +
            "</head>" +
            "<body>" +
            "<div class=\"container\">" +
            "<div class=\"header\"><h1>SICST - Sistema de Contrataciones con Subasta Inversa</h1></div>" +
            "<div class=\"content\">" + paragraphs + "</div>" +
            "<div class=\"footer\"><p>Este mensaje fue generado automáticamente. Por favor no responda a este correo.</p></div>" +
            "</div>" +
            "</body>" +
            "</html>";
    }
}
