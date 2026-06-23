using SICST.Domain.Entities;

namespace SICST.Api.Tenancy;

public interface ICurrentTenant
{
    Guid? CompanyId { get; set; }
    string? Domain { get; set; }
    Company? Company { get; set; }
}

public class CurrentTenant : ICurrentTenant
{
    public Guid? CompanyId { get; set; }
    public string? Domain { get; set; }
    public Company? Company { get; set; }
}
