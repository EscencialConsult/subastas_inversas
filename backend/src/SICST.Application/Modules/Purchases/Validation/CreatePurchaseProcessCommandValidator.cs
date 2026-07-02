using SICST.Application.Common.Validation;
using SICST.Application.Modules.Purchases.Commands;

namespace SICST.Application.Modules.Purchases.Validation;

public sealed class CreatePurchaseProcessCommandValidator : IRequestValidator<CreatePurchaseProcessCommand>
{
    public IEnumerable<ValidationFailure> Validate(CreatePurchaseProcessCommand request)
    {
        return PurchaseProcessRequestValidation.Validate(
            request.Title,
            request.EstimatedBudget,
            request.Items);
    }
}
