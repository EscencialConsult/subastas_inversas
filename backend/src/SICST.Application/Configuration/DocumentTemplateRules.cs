using Microsoft.EntityFrameworkCore;
using SICST.Application.Common.Interfaces;
using SICST.Application.Configuration.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Configuration;

public static class DocumentTemplateRules
{
    public static readonly Dictionary<DocumentTemplateType, string> DefaultNames = new()
    {
        [DocumentTemplateType.AwardAct] = "Acta de adjudicacion",
        [DocumentTemplateType.Contract] = "Contrato",
        [DocumentTemplateType.PurchaseOrder] = "Orden de compra"
    };

    public static readonly Dictionary<DocumentTemplateType, string> DefaultContents = new()
    {
        [DocumentTemplateType.AwardAct] = "ACTA DE ADJUDICACION\nProceso: {{process.code}} - {{process.title}}\nProveedor: {{supplier.businessName}}\nMonto: {{award.amount}}\nFecha: {{document.date}}",
        [DocumentTemplateType.Contract] = "CONTRATO\nContrato: {{contract.number}}\nProceso: {{process.code}} - {{process.title}}\nProveedor: {{supplier.businessName}}\nMonto: {{contract.amount}}\nTerminos: {{contract.terms}}",
        [DocumentTemplateType.PurchaseOrder] = "ORDEN DE COMPRA\nOC: {{purchaseOrder.number}}\nContrato: {{contract.number}}\nProveedor: {{supplier.businessName}}\nMonto: {{purchaseOrder.amount}}\nEntrega prevista: {{purchaseOrder.expectedDeliveryDate}}"
    };

    public static void Validate(DocumentTemplateType type, string name, string content)
    {
        if (!Enum.IsDefined(type))
        {
            throw new InvalidOperationException("Tipo de plantilla invalido.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException("El nombre de la plantilla es obligatorio.");
        }

        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("El contenido de la plantilla es obligatorio.");
        }
    }

    public static async Task<DocumentTemplate> EnsureActiveTemplate(
        IApplicationDbContext context,
        Guid companyId,
        DocumentTemplateType type,
        CancellationToken cancellationToken)
    {
        var template = await context.DocumentTemplates
            .Where(t => t.CompanyId == companyId && t.Type == type && t.Active)
            .OrderByDescending(t => t.Version)
            .FirstOrDefaultAsync(cancellationToken);

        if (template != null)
        {
            return template;
        }

        template = new DocumentTemplate
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            Type = type,
            Name = DefaultNames[type],
            Version = 1,
            Content = DefaultContents[type],
            Active = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.DocumentTemplates.Add(template);
        await context.SaveChangesAsync(cancellationToken);
        return template;
    }

    public static DocumentTemplateDto ToDto(DocumentTemplate entity)
    {
        return new DocumentTemplateDto
        {
            Id = entity.Id,
            CompanyId = entity.CompanyId,
            Type = entity.Type,
            Name = entity.Name,
            Version = entity.Version,
            Content = entity.Content,
            Active = entity.Active,
            CreatedAtUtc = entity.CreatedAtUtc
        };
    }
}
