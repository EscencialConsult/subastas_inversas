namespace SICST.Domain.Entities;

public class Company
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Domain { get; set; } = string.Empty;

    public string? Logo { get; set; }

    public string? PrimaryColor { get; set; }

    public bool IsPublicEntity { get; set; }
}
