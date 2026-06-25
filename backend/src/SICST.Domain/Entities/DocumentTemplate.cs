namespace SICST.Domain.Entities;

public enum DocumentTemplateType
{
    AwardAct = 0,
    Contract = 1,
    PurchaseOrder = 2
}

public class DocumentTemplate
{
    public Guid Id { get; set; }

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public DocumentTemplateType Type { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Version { get; set; }

    public string Content { get; set; } = string.Empty;

    public bool Active { get; set; } = true;

    public DateTime CreatedAtUtc { get; set; }
}
