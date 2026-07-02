namespace SICST.Application.Common.Exceptions;

public sealed class ValidationException : AppException
{
    public ValidationException(string message)
        : this(new Dictionary<string, string[]> { ["request"] = [message] })
    {
    }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("La solicitud contiene datos invalidos.")
    {
        Errors = errors;
    }

    public IDictionary<string, string[]> Errors { get; }
    public override int StatusCode => 400;
    public override string Title => "Error de validacion";
}
