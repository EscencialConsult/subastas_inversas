namespace SICST.Application.Common.Validation;

public interface IRequestValidator<in TRequest>
{
    IEnumerable<ValidationFailure> Validate(TRequest request);
}

public sealed record ValidationFailure(string PropertyName, string ErrorMessage);
