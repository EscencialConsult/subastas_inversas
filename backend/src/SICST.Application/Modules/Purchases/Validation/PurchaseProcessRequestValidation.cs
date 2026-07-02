using SICST.Application.Common.Validation;
using SICST.Application.Modules.Purchases.DTOs;

namespace SICST.Application.Modules.Purchases.Validation;

internal static class PurchaseProcessRequestValidation
{
    public static IEnumerable<ValidationFailure> Validate(
        string title,
        decimal estimatedBudget,
        IReadOnlyCollection<PurchaseItemInputDto> items)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            yield return new ValidationFailure("title", "El titulo es obligatorio.");
        }

        if (estimatedBudget < 0)
        {
            yield return new ValidationFailure("estimatedBudget", "El presupuesto no puede ser negativo.");
        }

        var index = 0;
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Description))
            {
                yield return new ValidationFailure($"items[{index}].description", "Todos los items deben tener descripcion.");
            }

            if (item.Quantity <= 0)
            {
                yield return new ValidationFailure($"items[{index}].quantity", "La cantidad de cada item debe ser mayor a cero.");
            }

            index++;
        }
    }
}
