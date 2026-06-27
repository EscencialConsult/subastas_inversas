using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SICST.Application.Common.Interfaces;
using SICST.Domain.Entities;

namespace SICST.Infrastructure.Services;

public class PdfGenerator : IPdfGenerator
{
    static PdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public string GenerateAwardAct(PurchaseProcess process, Award award, Supplier supplier, User approver, List<Bid> bids, DocumentTemplate? template = null)
    {
        var relativePath = Path.Combine("wwwroot", "documents", "awards");
        var absolutePath = Path.Combine(Directory.GetCurrentDirectory(), relativePath);

        if (!Directory.Exists(absolutePath))
        {
            Directory.CreateDirectory(absolutePath);
        }

        var fileName = $"{award.Id}.pdf";
        var fullPath = Path.Combine(absolutePath, fileName);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));

                page.Header()
                    .Column(column =>
                    {
                        column.Item().Text("SISTEMA DE COMPRAS PÚBLICAS Y SUBASTAS (SICST)").FontSize(10).SemiBold().FontColor(Colors.Blue.Medium);
                        column.Item().Text("ACTA DE ADJUDICACIÓN").FontSize(22).Bold().FontColor(Colors.Blue.Darken2);
                        column.Item().LineHorizontal(1).LineColor(Colors.Blue.Darken2);
                    });

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(col =>
                    {
                        col.Spacing(15);

                        col.Item().Text(t =>
                        {
                            t.Span("Por medio de la presente, se deja constancia de la adjudicación definitiva del proceso de compra referenciado a continuación, habiendo completado todas las etapas de evaluación y aprobación reglamentarias:").Italic();
                        });

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(150);
                                columns.RelativeColumn();
                            });

                            table.Cell().PaddingBottom(5).Text("Código de Proceso:").Bold();
                            table.Cell().PaddingBottom(5).Text(process.Code);

                            table.Cell().PaddingBottom(5).Text("Título del Proceso:").Bold();
                            table.Cell().PaddingBottom(5).Text(process.Title);

                            table.Cell().PaddingBottom(5).Text("Presupuesto Estimado:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{process.EstimatedBudget:C}");

                            table.Cell().PaddingBottom(5).Text("Adjudicado a:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{supplier.BusinessName} (CUIT: {supplier.Cuit})");

                            table.Cell().PaddingBottom(5).Text("Monto Adjudicado:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{award.Amount:C}");

                            table.Cell().PaddingBottom(5).Text("Fecha Adjudicación:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{award.AdjudicatedAtUtc.ToLocalTime():dd/MM/yyyy HH:mm} (Hora Local)");
                        });

                        if (!string.IsNullOrWhiteSpace(award.Observations))
                        {
                            col.Item().Column(obsCol =>
                            {
                                obsCol.Spacing(5);
                                obsCol.Item().Text("Fundamentos y Recomendación de la Adjudicación:").Bold();
                                obsCol.Item().Text(award.Observations).Italic();
                            });
                        }

                        AddTemplateContent(col, template, RenderAwardTemplate(template, process, award, supplier));

                        if (bids != null && bids.Any())
                        {
                            col.Item().Column(bCol =>
                            {
                                bCol.Spacing(5);
                                bCol.Item().Text("Historial de Ofertas (Subasta Inversa):").Bold();
                                bCol.Item().Table(bTable =>
                                {
                                    bTable.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn();
                                        columns.ConstantColumn(120);
                                        columns.ConstantColumn(150);
                                    });

                                    bTable.Header(header =>
                                    {
                                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Proveedor").Bold();
                                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Monto").Bold();
                                        header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Fecha/Hora").Bold();
                                    });

                                    foreach (var bid in bids)
                                    {
                                        bTable.Cell().Padding(5).Text(bid.Supplier?.BusinessName ?? "Proveedor");
                                        bTable.Cell().Padding(5).Text($"{bid.Amount:C}");
                                        bTable.Cell().Padding(5).Text($"{bid.PlacedAtUtc.ToLocalTime():dd/MM/yyyy HH:mm:ss}");
                                    }
                                });
                            });
                        }

                        col.Item().PaddingTop(30).AlignRight().Column(sigCol =>
                        {
                            sigCol.Spacing(5);
                            sigCol.Item().LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            sigCol.Item().Text($"{approver.FirstName} {approver.LastName}").Bold();
                            sigCol.Item().Text("Autoridad Firmante").FontSize(10).FontColor(Colors.Grey.Darken1);
                        });
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Página ");
                        x.CurrentPageNumber();
                        x.Span(" de ");
                        x.TotalPages();
                    });
            });
        }).GeneratePdf(fullPath);

        return fullPath;
    }

    public string GenerateContract(PurchaseProcess process, Contract contract, Supplier supplier, DocumentTemplate? template = null)
    {
        var fullPath = CreateDocumentPath("contracts", contract.Id);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));
                page.Header().Text($"CONTRATO {contract.Number}").FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                {
                    col.Spacing(12);
                    col.Item().Text($"Proceso: {process.Code} - {process.Title}");
                    col.Item().Text($"Proveedor: {supplier.BusinessName} - CUIT {supplier.Cuit}");
                    col.Item().Text($"Monto contractual: {contract.Amount:C}");
                    col.Item().Text($"Inicio: {contract.StartDateUtc:dd/MM/yyyy}");
                    if (contract.EndDateUtc.HasValue)
                    {
                        col.Item().Text($"Fin previsto: {contract.EndDateUtc.Value:dd/MM/yyyy}");
                    }
                    if (!string.IsNullOrWhiteSpace(contract.Terms))
                    {
                        col.Item().Text("Condiciones").Bold();
                        col.Item().Text(contract.Terms);
                    }
                    AddTemplateContent(col, template, RenderContractTemplate(template, process, contract, supplier));
                });
                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Pagina ");
                    x.CurrentPageNumber();
                    x.Span(" de ");
                    x.TotalPages();
                });
            });
        }).GeneratePdf(fullPath);

        return fullPath;
    }

    public string GeneratePurchaseOrder(PurchaseProcess process, PurchaseOrder order, Supplier supplier, DocumentTemplate? template = null)
    {
        var fullPath = CreateDocumentPath("purchase-orders", order.Id);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));
                page.Header().Text($"ORDEN DE COMPRA {order.Number}").FontSize(20).Bold().FontColor(Colors.Green.Darken2);
                page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                {
                    col.Spacing(12);
                    col.Item().Text($"Proceso: {process.Code} - {process.Title}");
                    col.Item().Text($"Proveedor: {supplier.BusinessName} - CUIT {supplier.Cuit}");
                    col.Item().Text($"Monto: {order.Amount:C}");
                    col.Item().Text($"Fecha de emision: {order.IssuedAtUtc:dd/MM/yyyy}");
                    if (order.ExpectedDeliveryDateUtc.HasValue)
                    {
                        col.Item().Text($"Entrega prevista: {order.ExpectedDeliveryDateUtc.Value:dd/MM/yyyy}");
                    }
                    if (process.Items.Count > 0)
                    {
                        col.Item().Text("Items").Bold();
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.ConstantColumn(80);
                                columns.ConstantColumn(80);
                            });
                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Descripcion").Bold();
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Cantidad").Bold();
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Unidad").Bold();
                            });
                            foreach (var item in process.Items)
                            {
                                table.Cell().Padding(5).Text(item.Description);
                                table.Cell().Padding(5).Text(item.Quantity.ToString("0.##"));
                                table.Cell().Padding(5).Text(item.Unit);
                            }
                        });
                    }
                    if (!string.IsNullOrWhiteSpace(order.Observations))
                    {
                        col.Item().Text("Observaciones").Bold();
                        col.Item().Text(order.Observations);
                    }
                    AddTemplateContent(col, template, RenderPurchaseOrderTemplate(template, process, order, supplier));
                });
            });
        }).GeneratePdf(fullPath);

        return fullPath;
    }

    public string GenerateReceptionConfirmation(PurchaseOrder order, ReceptionConfirmation reception)
    {
        var fullPath = CreateDocumentPath("receptions", reception.Id);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));
                page.Header().Text("CONFIRMACION DE RECEPCION").FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                {
                    col.Spacing(12);
                    col.Item().Text($"Orden de compra: {order.Number}");
                    col.Item().Text($"Fecha de recepcion: {reception.ReceivedAtUtc:dd/MM/yyyy HH:mm}");
                    col.Item().Text($"Estado: {reception.Status}");
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn();
                            columns.ConstantColumn(90);
                            columns.ConstantColumn(80);
                        });
                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Item").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Recibido").Bold();
                            header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Unidad").Bold();
                        });
                        foreach (var item in reception.Items)
                        {
                            table.Cell().Padding(5).Text(item.PurchaseItem?.Description ?? item.PurchaseItemId.ToString());
                            table.Cell().Padding(5).Text(item.QuantityReceived.ToString("0.##"));
                            table.Cell().Padding(5).Text(item.PurchaseItem?.Unit ?? string.Empty);
                        }
                    });
                    if (!string.IsNullOrWhiteSpace(reception.Observations))
                    {
                        col.Item().Text("Observaciones").Bold();
                        col.Item().Text(reception.Observations);
                    }
                });
            });
        }).GeneratePdf(fullPath);

        return fullPath;
    }

    private static string CreateDocumentPath(string folder, Guid id)
    {
        var relativePath = Path.Combine("wwwroot", "documents", folder);
        var absolutePath = Path.Combine(Directory.GetCurrentDirectory(), relativePath);

        if (!Directory.Exists(absolutePath))
        {
            Directory.CreateDirectory(absolutePath);
        }

        return Path.Combine(absolutePath, $"{id}.pdf");
    }

    private static void AddTemplateContent(ColumnDescriptor col, DocumentTemplate? template, string renderedContent)
    {
        if (template == null || string.IsNullOrWhiteSpace(renderedContent))
        {
            return;
        }

        col.Item().PaddingTop(10).Column(templateCol =>
        {
            templateCol.Spacing(6);
            templateCol.Item().Text($"Plantilla: {template.Name} v{template.Version}").Bold().FontColor(Colors.Blue.Darken2);
            templateCol.Item().Text(renderedContent);
        });
    }

    private static string RenderAwardTemplate(DocumentTemplate? template, PurchaseProcess process, Award award, Supplier supplier)
    {
        return RenderTemplate(template?.Content, new Dictionary<string, string>
        {
            ["process.code"] = process.Code,
            ["process.title"] = process.Title,
            ["supplier.businessName"] = supplier.BusinessName,
            ["supplier.cuit"] = supplier.Cuit,
            ["award.amount"] = award.Amount.ToString("C"),
            ["document.date"] = DateTime.UtcNow.ToString("dd/MM/yyyy")
        });
    }

    private static string RenderContractTemplate(DocumentTemplate? template, PurchaseProcess process, Contract contract, Supplier supplier)
    {
        return RenderTemplate(template?.Content, new Dictionary<string, string>
        {
            ["process.code"] = process.Code,
            ["process.title"] = process.Title,
            ["supplier.businessName"] = supplier.BusinessName,
            ["supplier.cuit"] = supplier.Cuit,
            ["contract.number"] = contract.Number,
            ["contract.amount"] = contract.Amount.ToString("C"),
            ["contract.terms"] = contract.Terms,
            ["document.date"] = DateTime.UtcNow.ToString("dd/MM/yyyy")
        });
    }

    private static string RenderPurchaseOrderTemplate(DocumentTemplate? template, PurchaseProcess process, PurchaseOrder order, Supplier supplier)
    {
        return RenderTemplate(template?.Content, new Dictionary<string, string>
        {
            ["process.code"] = process.Code,
            ["process.title"] = process.Title,
            ["supplier.businessName"] = supplier.BusinessName,
            ["supplier.cuit"] = supplier.Cuit,
            ["purchaseOrder.number"] = order.Number,
            ["purchaseOrder.amount"] = order.Amount.ToString("C"),
            ["purchaseOrder.expectedDeliveryDate"] = order.ExpectedDeliveryDateUtc?.ToString("dd/MM/yyyy") ?? "Sin fecha",
            ["document.date"] = DateTime.UtcNow.ToString("dd/MM/yyyy")
        });
    }

    private static string RenderTemplate(string? content, Dictionary<string, string> values)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            return string.Empty;
        }

        var rendered = content;
        foreach (var (key, value) in values)
        {
            rendered = rendered.Replace($"{{{{{key}}}}}", value);
        }

        return rendered;
    }

    public string GenerateEvaluationAct(PurchaseProcess process, List<Invitation> invitations, User evaluator, string hash, string signature, byte[]? signatureImageBytes)
    {
        var fullPath = CreateDocumentPath("evaluation-acts", process.Id);

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11).FontColor(Colors.Grey.Darken3));

                page.Header()
                    .Column(column =>
                    {
                        column.Item().Text("SISTEMA DE COMPRAS PÚBLICAS Y SUBASTAS (SICST)").FontSize(10).SemiBold().FontColor(Colors.Blue.Medium);
                        column.Item().Text("ACTA DE EVALUACIÓN DE PROVEEDORES").FontSize(20).Bold().FontColor(Colors.Blue.Darken2);
                        column.Item().LineHorizontal(1).LineColor(Colors.Blue.Darken2);
                    });

                page.Content()
                    .PaddingVertical(1, Unit.Centimetre)
                    .Column(col =>
                    {
                        col.Spacing(15);

                        col.Item().Text(t =>
                        {
                            t.Span("Por medio de la presente, se deja constancia de la evaluación y calificación de los proveedores que han aceptado participar en el proceso de compra referenciado, habiendo cumplido con los requisitos formales y técnicos. El presente documento, firmado y auditado, habilita el inicio de la subasta inversa correspondiente:").Italic();
                        });

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(150);
                                columns.RelativeColumn();
                            });

                            table.Cell().PaddingBottom(5).Text("Código de Proceso:").Bold();
                            table.Cell().PaddingBottom(5).Text(process.Code);

                            table.Cell().PaddingBottom(5).Text("Título del Proceso:").Bold();
                            table.Cell().PaddingBottom(5).Text(process.Title);

                            table.Cell().PaddingBottom(5).Text("Presupuesto Estimado:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{process.EstimatedBudget:C}");

                            table.Cell().PaddingBottom(5).Text("Fecha del Acta:").Bold();
                            table.Cell().PaddingBottom(5).Text($"{DateTime.UtcNow.ToLocalTime():dd/MM/yyyy HH:mm} (Hora Local)");
                        });

                        col.Item().Text("Resultado de Calificación de Proveedores:").Bold().FontSize(14).FontColor(Colors.Blue.Darken1);

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.ConstantColumn(100);
                                columns.ConstantColumn(100);
                                columns.RelativeColumn();
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Proveedor").Bold();
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("CUIT").Bold();
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Estado").Bold();
                                header.Cell().Background(Colors.Grey.Lighten3).Padding(5).Text("Observaciones / Fundamentos").Bold();
                            });

                            foreach (var inv in invitations)
                            {
                                table.Cell().Padding(5).Text(inv.Supplier?.BusinessName ?? "Proveedor");
                                table.Cell().Padding(5).Text(inv.Supplier?.Cuit ?? "N/A");
                                
                                var statusText = inv.QualificationStatus.ToString();
                                table.Cell().Padding(5).Text(statusText).Bold();
                                
                                table.Cell().Padding(5).Text(inv.QualificationNotes ?? "-");
                            }
                        });

                        col.Item().PaddingTop(10).Column(auditCol =>
                        {
                            auditCol.Spacing(5);
                            auditCol.Item().Text("Seguridad e Inmutabilidad (SHA-256 & Firma Digital):").Bold().FontSize(12).FontColor(Colors.Grey.Darken2);
                            auditCol.Item().Text(t =>
                            {
                                t.Span("Hash SHA-256: ").Bold();
                                t.Span(hash).FontFamily("Courier New").FontSize(10);
                            });
                            auditCol.Item().Text(t =>
                            {
                                t.Span("Firma Digital: ").Bold();
                                t.Span(signature).FontFamily("Courier New").FontSize(10);
                            });
                        });

                        col.Item().PaddingTop(20).AlignRight().Width(200).Column(sigCol =>
                        {
                            sigCol.Spacing(5);
                            
                            if (signatureImageBytes != null && signatureImageBytes.Length > 0)
                            {
                                try
                                {
                                    sigCol.Item().Height(60).Image(signatureImageBytes);
                                }
                                catch
                                {
                                    sigCol.Item().Height(60).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                                }
                            }
                            else
                            {
                                sigCol.Item().Height(60).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                            }

                            sigCol.Item().Text($"{evaluator.FirstName} {evaluator.LastName}").Bold();
                            sigCol.Item().Text("Evaluador Firmante").FontSize(10).FontColor(Colors.Grey.Darken1);
                        });
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(x =>
                    {
                        x.Span("Página ");
                        x.CurrentPageNumber();
                        x.Span(" de ");
                        x.TotalPages();
                    });
            });
        }).GeneratePdf(fullPath);

        return fullPath;
    }
}
