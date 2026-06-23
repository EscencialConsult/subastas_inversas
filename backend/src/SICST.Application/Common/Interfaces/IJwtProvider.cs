using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface IJwtProvider
{
    string Generate(User user);
    bool IsValidForUser(string token, string email);
}
