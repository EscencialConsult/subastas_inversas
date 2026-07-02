namespace SICST.Application.Common.Exceptions;

public sealed class BusinessRuleException : AppException
{
    public BusinessRuleException(string message)
        : base(message)
    {
    }

    public override int StatusCode => 400;
    public override string Title => "Regla de negocio";
}
