using System.Security.Claims;

namespace Lists.Api.Services;

public class Auth0UserContext : IUserContext
{
    public string Auth0UserId { get; }

    public Auth0UserContext(IHttpContextAccessor httpContextAccessor)
    {
        var principal = httpContextAccessor.HttpContext?.User;

        if (principal?.Identity?.IsAuthenticated != true)
        {
            throw new UnauthorizedAccessException("An authenticated user is required.");
        }

        var auth0UserId = FindClaim(principal, ClaimTypes.NameIdentifier, "sub");

        if (string.IsNullOrWhiteSpace(auth0UserId))
        {
            throw new UnauthorizedAccessException("The authenticated user is missing a subject claim.");
        }

        Auth0UserId = auth0UserId;
    }

    private static string? FindClaim(ClaimsPrincipal principal, params string[] claimTypes)
    {
        foreach (var claimType in claimTypes)
        {
            var value = principal.FindFirst(claimType)?.Value;

            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }

        return null;
    }
}
