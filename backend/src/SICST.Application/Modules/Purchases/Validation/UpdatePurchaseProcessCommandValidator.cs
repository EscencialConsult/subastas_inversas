using SICST.Application.Common.Validation;
using SICST.Application.Modules.Purchases.Commands;

namespace SICST.Application.Modules.Purchases.Validation;

public sealed class UpdatePurchaseProcessCommandValidator : IRequestValidator<UpdatePurchaseProcessCommand>
{
    public IEnumerable<ValidationFailure> Validate(UpdatePurchaseProcessCommand request)
    {
        return PurchaseProcessRequestValidation.Validate(
            request.Title,
            request.EstimatedBudget,
            request.Items);
    }
}
