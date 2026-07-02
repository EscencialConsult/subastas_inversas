using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Modules.Configuration.DTOs;

namespace SICST.Application.Modules.Configuration.Commands;

public record ActivateDocumentTemplateCommand(Guid CompanyId, Guid Id) : IRequest<DocumentTemplateDto>;

public class ActivateDocumentTemplateCommandHandler : IRequestHandler<ActivateDocumentTemplateCommand, DocumentTemplateDto>
{
    private readonly IApplicationDbContext _context;

    public ActivateDocumentTemplateCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DocumentTemplateDto> Handle(ActivateDocumentTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.DocumentTemplates
            .FirstOrDefaultAsync(t => t.Id == request.Id && t.CompanyId == request.CompanyId, cancellationToken);

        if (template == null)
        {
            throw new InvalidOperationException("Plantilla no encontrada.");
        }

        var activeTemplates = await _context.DocumentTemplates
            .Where(t => t.CompanyId == request.CompanyId && t.Type == template.Type && t.Active)
            .ToListAsync(cancellationToken);

        foreach (var activeTemplate in activeTemplates)
        {
            activeTemplate.Active = false;
        }

        template.Active = true;
        await _context.SaveChangesAsync(cancellationToken);
        return DocumentTemplateRules.ToDto(template);
    }
}
