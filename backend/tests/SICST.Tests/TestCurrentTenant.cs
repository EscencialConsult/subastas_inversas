using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Tests;

public class TestCurrentTenant : ICurrentTenant
{
    public Guid? CompanyId { get; set; }
    public string? Domain { get; set; }
    public Company? Company { get; set; }
}
