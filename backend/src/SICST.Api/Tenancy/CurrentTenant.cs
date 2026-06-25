using SICST.Domain.Entities;
using SICST.Application.Common.Interfaces;

namespace SICST.Api.Tenancy;

public class CurrentTenant : ICurrentTenant
{
    public Guid? CompanyId { get; set; }
    public string? Domain { get; set; }
    public Company? Company { get; set; }
}
