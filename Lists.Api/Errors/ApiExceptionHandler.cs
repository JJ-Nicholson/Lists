using Microsoft.AspNetCore.Diagnostics;

namespace Lists.Api.Errors;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        var (statusCode, message, code) = exception switch
        {
            ApiException apiException => (
                apiException.StatusCode,
                apiException.Message,
                apiException.Code),
            _ => (
                StatusCodes.Status500InternalServerError,
                "An unexpected error occurred.",
                null)
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled exception.");
        }

        httpContext.Response.StatusCode = statusCode;

        if (code is null)
        {
            await httpContext.Response.WriteAsJsonAsync(new { message }, cancellationToken);
        }
        else
        {
            await httpContext.Response.WriteAsJsonAsync(new { message, code }, cancellationToken);
        }

        return true;
    }
}
