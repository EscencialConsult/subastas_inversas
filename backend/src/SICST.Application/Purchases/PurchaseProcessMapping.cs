using SICST.Application.Purchases.DTOs;
using SICST.Domain.Entities;

namespace SICST.Application.Purchases;

public static class PurchaseProcessMapping
{
    public static PurchaseProcessDto ToDto(PurchaseProcess process)
    {
        return new PurchaseProcessDto
        {
            Id = process.Id,
            CompanyId = process.CompanyId,
            BuyerId = process.BuyerId,
            ContractingModeId = process.ContractingModeId,
            Code = process.Code,
            Title = process.Title,
            Description = process.Description,
            EstimatedBudget = process.EstimatedBudget,
            Status = process.Status,
            CreatedAtUtc = process.CreatedAtUtc,
            PublishedAtUtc = process.PublishedAtUtc,
            ClosedAtUtc = process.ClosedAtUtc,
            RejectionReason = process.RejectionReason,
            Evaluation = process.Evaluation != null ? new EvaluationDto
            {
                Id = process.Evaluation.Id,
                PurchaseProcessId = process.Evaluation.PurchaseProcessId,
                EvaluatorId = process.Evaluation.EvaluatorId,
                EvaluatorName = process.Evaluation.Evaluator != null ? $"{process.Evaluation.Evaluator.FirstName} {process.Evaluation.Evaluator.LastName}" : string.Empty,
                RecomendadoProveedor = process.Evaluation.RecommendedSupplier,
                Observaciones = process.Evaluation.Observations,
                Fecha = process.Evaluation.CreatedAtUtc.ToString("yyyy-MM-dd")
            } : null,
            Awards = process.Awards.OrderBy(a => a.AdjudicatedAtUtc).Select(a => ToAwardDto(process, a)).ToList(),
            Award = process.Awards.OrderBy(a => a.AdjudicatedAtUtc).Select(a => ToAwardDto(process, a)).FirstOrDefault(),
            Contracts = process.Contracts.OrderBy(c => c.CreatedAtUtc).Select(ToContractDto).ToList(),
            Contract = process.Contracts.OrderBy(c => c.CreatedAtUtc).Select(ToContractDto).FirstOrDefault(),
            PurchaseOrders = process.PurchaseOrders.OrderBy(o => o.IssuedAtUtc).Select(ToPurchaseOrderDto).ToList(),
            PurchaseOrder = process.PurchaseOrders.OrderBy(o => o.IssuedAtUtc).Select(ToPurchaseOrderDto).FirstOrDefault(),
            Items = process.Items.Select(item => new PurchaseItemDto
            {
                Id = item.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = item.Unit,
                EstimatedUnitPrice = item.EstimatedUnitPrice
            }).ToList(),
            SpecificationsHash = process.SpecificationsHash,
            IsEvaluationActSigned = process.IsEvaluationActSigned,
            EvaluationActHash = process.EvaluationActHash,
            EvaluationActSignature = process.EvaluationActSignature,
            EvaluationActSignedAtUtc = process.EvaluationActSignedAtUtc,
            EvaluationActSignedById = process.EvaluationActSignedById,
            EvaluationActSignedByName = process.EvaluationActSignedBy != null ? $"{process.EvaluationActSignedBy.FirstName} {process.EvaluationActSignedBy.LastName}" : null
        };
    }

    public static AwardDto ToAwardDto(PurchaseProcess process, Award award)
    {
        return new AwardDto
        {
            Id = award.Id,
            PurchaseProcessId = award.PurchaseProcessId,
            SupplierId = award.SupplierId,
            Proveedor = award.Supplier != null ? award.Supplier.BusinessName : string.Empty,
            Monto = award.Amount,
            AprobadorId = award.AdjudicatedById,
            AprobadorName = award.AdjudicatedBy != null ? $"{award.AdjudicatedBy.FirstName} {award.AdjudicatedBy.LastName}" : string.Empty,
            Observaciones = award.Observations,
            Fecha = award.AdjudicatedAtUtc.ToString("yyyy-MM-dd"),
            ActaUrl = $"/api/companies/{process.CompanyId}/purchase-processes/{process.Id}/awards/{award.Id}/pdf",
            DocumentTemplateId = award.DocumentTemplateId,
            Items = award.Items.Select(item => new AwardItemDto
            {
                Id = item.Id,
                PurchaseItemId = item.PurchaseItemId,
                Description = item.PurchaseItem?.Description ?? string.Empty,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                TotalAmount = item.TotalAmount
            }).ToList()
        };
    }

    public static ContractDto ToContractDto(Contract contract)
    {
        return new ContractDto
        {
            Id = contract.Id,
            CompanyId = contract.CompanyId,
            PurchaseProcessId = contract.PurchaseProcessId,
            AwardId = contract.AwardId,
            SupplierId = contract.SupplierId,
            SupplierName = contract.Supplier?.BusinessName ?? string.Empty,
            Number = contract.Number,
            Amount = contract.Amount,
            StartDateUtc = contract.StartDateUtc,
            EndDateUtc = contract.EndDateUtc,
            Status = contract.Status,
            Terms = contract.Terms,
            CreatedAtUtc = contract.CreatedAtUtc,
            SignedAtUtc = contract.SignedAtUtc,
            DocumentUrl = $"/api/companies/{contract.CompanyId}/contracts/{contract.Id}/pdf",
            DocumentTemplateId = contract.DocumentTemplateId
        };
    }

    public static PurchaseOrderDto ToPurchaseOrderDto(PurchaseOrder order)
    {
        return new PurchaseOrderDto
        {
            Id = order.Id,
            CompanyId = order.CompanyId,
            PurchaseProcessId = order.PurchaseProcessId,
            ContractId = order.ContractId,
            SupplierId = order.SupplierId,
            SupplierName = order.Supplier?.BusinessName ?? string.Empty,
            Number = order.Number,
            Amount = order.Amount,
            Status = order.Status,
            IssuedAtUtc = order.IssuedAtUtc,
            ExpectedDeliveryDateUtc = order.ExpectedDeliveryDateUtc,
            Observations = order.Observations,
            DocumentUrl = $"/api/companies/{order.CompanyId}/purchase-orders/{order.Id}/pdf",
            DocumentTemplateId = order.DocumentTemplateId,
            Receptions = order.Receptions
                .OrderByDescending(r => r.ReceivedAtUtc)
                .Select(ToReceptionDto)
                .ToList()
        };
    }

    public static ReceptionConfirmationDto ToReceptionDto(ReceptionConfirmation reception)
    {
        return new ReceptionConfirmationDto
        {
            Id = reception.Id,
            PurchaseOrderId = reception.PurchaseOrderId,
            ReceivedById = reception.ReceivedById,
            ReceivedByName = reception.ReceivedBy != null ? $"{reception.ReceivedBy.FirstName} {reception.ReceivedBy.LastName}" : string.Empty,
            Status = reception.Status,
            ReceivedAtUtc = reception.ReceivedAtUtc,
            Observations = reception.Observations,
            DocumentUrl = reception.PurchaseOrder != null
                ? $"/api/companies/{reception.PurchaseOrder.CompanyId}/receptions/{reception.Id}/pdf"
                : string.Empty,
            Items = reception.Items.Select(item => new ReceptionConfirmationItemDto
            {
                Id = item.Id,
                PurchaseItemId = item.PurchaseItemId,
                Description = item.PurchaseItem?.Description ?? string.Empty,
                OrderedQuantity = item.PurchaseItem?.Quantity ?? 0,
                QuantityReceived = item.QuantityReceived,
                Unit = item.PurchaseItem?.Unit ?? string.Empty
            }).ToList()
        };
    }
}
