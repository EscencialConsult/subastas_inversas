namespace SICST.Application.Common.Exceptions;

public class ForbiddenAccessException : AppException
{
    public ForbiddenAccessException()
        : base("No tienes permisos para acceder a este recurso.")
    {
    }

    public override int StatusCode => 403;
    public override string Title => "Acceso denegado";
}
