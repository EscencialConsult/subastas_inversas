namespace SICST.Application.Modules.Tenancy.Companies.DTOs;

public class CompanyCreationResultDto
{
    public Guid CompanyId { get; set; }
    public string TemporaryAdminPassword { get; set; } = string.Empty;
}
