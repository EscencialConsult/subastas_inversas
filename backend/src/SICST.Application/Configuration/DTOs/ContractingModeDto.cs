namespace SICST.Application.Configuration.DTOs;

public class ContractingModeDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool RequiresAuction { get; set; }
    public bool Active { get; set; }
}
