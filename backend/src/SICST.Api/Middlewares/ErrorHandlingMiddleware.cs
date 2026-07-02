using System.Net;
using Microsoft.AspNetCore.Mvc;
using SICST.Application.Common.Exceptions;
using ValidationException = SICST.Application.Common.Exceptions.ValidationException;

namespace SICST.Api.Middlewares;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Uncaught exception occurred during request processing.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = (int)HttpStatusCode.InternalServerError;
        var title = "Error interno";
        var detail = "Ha ocurrido un error interno en el servidor.";
        IDictionary<string, string[]>? errors = null;

        if (exception is ValidationException validationException)
        {
            statusCode = validationException.StatusCode;
            title = validationException.Title;
            detail = validationException.Message;
            errors = validationException.Errors;
        }
        else if (exception is AppException appException)
        {
            statusCode = appException.StatusCode;
            title = appException.Title;
            detail = appException.Message;
        }
        else if (exception is UnauthorizedAccessException)
        {
            statusCode = (int)HttpStatusCode.Unauthorized;
            title = "No autorizado";
            detail = exception.Message;
        }
        else if (exception is InvalidOperationException)
        {
            var msg = exception.Message.ToLowerInvariant();
            statusCode = msg.Contains("no encontrado") || msg.Contains("no existe") || msg.Contains("not found")
                ? (int)HttpStatusCode.NotFound
                : (int)HttpStatusCode.BadRequest;
            title = statusCode == (int)HttpStatusCode.NotFound ? "Recurso no encontrado" : "Regla de negocio";
            detail = exception.Message;
        }

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["traceId"] = context.TraceIdentifier;
        if (errors != null)
        {
            problem.Extensions["errors"] = errors;
        }

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;
        await context.Response.WriteAsJsonAsync(problem);
    }
}
