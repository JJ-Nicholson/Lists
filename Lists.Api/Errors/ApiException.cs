namespace Lists.Api.Errors;

public abstract class ApiException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public class BadRequestException(string message)
    : ApiException(message, StatusCodes.Status400BadRequest);

public class NotFoundException(string message)
    : ApiException(message, StatusCodes.Status404NotFound);

public class ForbiddenException(string message)
    : ApiException(message, StatusCodes.Status403Forbidden);

public class ConflictException(string message)
    : ApiException(message, StatusCodes.Status409Conflict);

public class ExternalServiceException(string message)
    : ApiException(message, StatusCodes.Status502BadGateway);
