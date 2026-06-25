using SICST.Domain.Entities;

namespace SICST.Application.Common.Interfaces;

public interface ICurrentTenant
{
    Guid? CompanyId { get; set; }
    string? Domain { get; set; }
    Company? Company { get; set; }
}
