using SICST.Domain.Entities;

namespace SICST.Application.Configuration.DTOs;

public class DocumentTemplateDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public DocumentTemplateType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Version { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool Active { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
