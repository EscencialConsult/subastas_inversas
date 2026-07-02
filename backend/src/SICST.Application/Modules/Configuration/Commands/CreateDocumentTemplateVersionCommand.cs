using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Modules.Configuration.Commands;

public record CreateDocumentTemplateVersionCommand : IRequest<DocumentTemplateDto>
{
    public Guid CompanyId { get; init; }
    public DocumentTemplateType Type { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public bool Activate { get; init; } = true;
}

public class CreateDocumentTemplateVersionCommandHandler : IRequestHandler<CreateDocumentTemplateVersionCommand, DocumentTemplateDto>
{
    private readonly IApplicationDbContext _context;

    public CreateDocumentTemplateVersionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DocumentTemplateDto> Handle(CreateDocumentTemplateVersionCommand request, CancellationToken cancellationToken)
    {
        if (!await _context.Companies.AnyAsync(c => c.Id == request.CompanyId, cancellationToken))
        {
            throw new InvalidOperationException("Empresa no encontrada.");
        }

        DocumentTemplateRules.Validate(request.Type, request.Name, request.Content);

        var nextVersion = await _context.DocumentTemplates
            .Where(t => t.CompanyId == request.CompanyId && t.Type == request.Type)
            .Select(t => (int?)t.Version)
            .MaxAsync(cancellationToken) ?? 0;

        if (request.Activate)
        {
            var activeTemplates = await _context.DocumentTemplates
                .Where(t => t.CompanyId == request.CompanyId && t.Type == request.Type && t.Active)
                .ToListAsync(cancellationToken);

            foreach (var activeTemplate in activeTemplates)
            {
                activeTemplate.Active = false;
            }
        }

        var template = new DocumentTemplate
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Type = request.Type,
            Name = request.Name.Trim(),
            Version = nextVersion + 1,
            Content = request.Content.Trim(),
            Active = request.Activate,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.DocumentTemplates.Add(template);
        await _context.SaveChangesAsync(cancellationToken);
        return DocumentTemplateRules.ToDto(template);
    }
}
