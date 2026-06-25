using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IJwtProvider
{
    string Generate(User user);
    string GenerateMfaToken(User user);
    bool TryGetMfaUserId(string token, out Guid userId);
}
