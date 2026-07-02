namespace SICST.Application.Common.Exceptions;

public abstract class AppException : Exception
{
    protected AppException(string message)
        : base(message)
    {
    }

    public abstract int StatusCode { get; }
    public virtual string Title => "Error de aplicacion";
}
