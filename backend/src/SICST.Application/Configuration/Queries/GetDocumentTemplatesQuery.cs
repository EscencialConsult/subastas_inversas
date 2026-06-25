using MediatR;
using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration.Queries;

public record GetDocumentTemplatesQuery(Guid CompanyId, DocumentTemplateType? Type = null) : IRequest<List<DocumentTemplateDto>>;

public class GetDocumentTemplatesQueryHandler : IRequestHandler<GetDocumentTemplatesQuery, List<DocumentTemplateDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDocumentTemplatesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<DocumentTemplateDto>> Handle(GetDocumentTemplatesQuery request, CancellationToken cancellationToken)
    {
        foreach (var type in Enum.GetValues<DocumentTemplateType>())
        {
            if (request.Type == null || request.Type == type)
            {
                await DocumentTemplateRules.EnsureActiveTemplate(_context, request.CompanyId, type, cancellationToken);
            }
        }

        var query = _context.DocumentTemplates.Where(t => t.CompanyId == request.CompanyId);
        if (request.Type.HasValue)
        {
            query = query.Where(t => t.Type == request.Type.Value);
        }

        var templates = await query
            .OrderBy(t => t.Type)
            .ThenByDescending(t => t.Version)
            .ToListAsync(cancellationToken);

        return templates.Select(DocumentTemplateRules.ToDto).ToList();
    }
}
