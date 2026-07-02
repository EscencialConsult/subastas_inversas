namespace SICST.Application.Modules.Purchases.DTOs;

public sealed record CreatePurchaseProcessDto(
    Guid CompanyId,
    Guid BuyerId,
    Guid? ContractingModeId,
    string Title,
    string Description,
    decimal EstimatedBudget,
    List<PurchaseItemInputDto> Items);

public sealed record UpdatePurchaseProcessDto(
    Guid Id,
    Guid CompanyId,
    Guid? ContractingModeId,
    string Title,
    string Description,
    decimal EstimatedBudget,
    List<PurchaseItemInputDto> Items);
