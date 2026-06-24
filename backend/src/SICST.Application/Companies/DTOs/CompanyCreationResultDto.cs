namespace SICST.Application.Companies.DTOs;

public class CompanyCreationResultDto
{
    public Guid CompanyId { get; set; }
    public string TemporaryAdminPassword { get; set; } = string.Empty;
}
