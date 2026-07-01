namespace SICST.Application.Common.Interfaces;

public record AdvancedSignatureRequest(
    string DocumentType,
    Guid EntityId,
    Guid SignerId,
    string SignerEmail,
    string Payload);

public record AdvancedSignatureResult(
    string ContentHash,
    string Pkcs7SignatureBase64,
    string CertificateSubject,
    string CertificateSerialNumber,
    DateTime SignedAtUtc,
    string Algorithm,
    string Format);

public interface IAdvancedDigitalSignatureService
{
    Task<AdvancedSignatureResult> SignAsync(
        AdvancedSignatureRequest request,
        CancellationToken cancellationToken);

    Task<bool> VerifyAsync(
        string payload,
        AdvancedSignatureResult signature,
        CancellationToken cancellationToken);
}
