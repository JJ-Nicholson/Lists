namespace Lists.Api.Errors;

public abstract class ApiException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public sealed class BadRequestException(string message)
    : ApiException(message, StatusCodes.Status400BadRequest);

public sealed class NotFoundException(string message)
    : ApiException(message, StatusCodes.Status404NotFound);

public sealed class ForbiddenException(string message)
    : ApiException(message, StatusCodes.Status403Forbidden);

public sealed class ConflictException(string message)
    : ApiException(message, StatusCodes.Status409Conflict);
