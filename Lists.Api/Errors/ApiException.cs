namespace Lists.Api.Errors;

public abstract class ApiException(
    string message,
    int statusCode,
    string? code = null,
    Exception? innerException = null)
    : Exception(message, innerException)
{
    public int StatusCode { get; } = statusCode;
    public string? Code { get; } = code;
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

public class AccountDeletionIncompleteException(Exception innerException)
    : ApiException(
        "Account deletion could not be completed right now.",
        StatusCodes.Status500InternalServerError,
        "account_deletion_incomplete",
        innerException);
