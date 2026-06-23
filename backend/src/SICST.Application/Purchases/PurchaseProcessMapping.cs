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
            Items = process.Items.Select(item => new PurchaseItemDto
            {
                Id = item.Id,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = item.Unit,
                EstimatedUnitPrice = item.EstimatedUnitPrice
            }).ToList()
        };
    }
}
