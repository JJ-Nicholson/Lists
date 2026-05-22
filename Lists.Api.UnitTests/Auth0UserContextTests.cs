using System.Security.Claims;
using Lists.Api.Services;
using Microsoft.AspNetCore.Http;

namespace Lists.Api.UnitTests;

public class Auth0UserContextTests
{
    // Verifies Auth0 user IDs can be read from the standard name identifier claim.
    [Fact]
    public void Constructor_WhenUserHasNameIdentifierClaim_SetsAuth0UserId()
    {
        // Arrange
        var principal = CreatePrincipal(new Claim(ClaimTypes.NameIdentifier, "auth0|test-user"));

        // Act
        var userContext = CreateUserContext(principal);

        // Assert
        Assert.Equal("auth0|test-user", userContext.Auth0UserId);
    }

    // Verifies Auth0 user IDs can be read from the JWT subject claim.
    [Fact]
    public void Constructor_WhenUserHasSubClaim_SetsAuth0UserId()
    {
        // Arrange
        var principal = CreatePrincipal(new Claim("sub", "auth0|test-user"));

        // Act
        var userContext = CreateUserContext(principal);

        // Assert
        Assert.Equal("auth0|test-user", userContext.Auth0UserId);
    }

    // Verifies a principal with no authenticated identity is rejected before claim lookup.
    [Fact]
    public void Constructor_WhenUserIsNotAuthenticated_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        // Act
        var exception = Assert.Throws<UnauthorizedAccessException>(() => CreateUserContext(principal));

        // Assert
        Assert.Equal("An authenticated user is required.", exception.Message);
    }

    // Verifies an authenticated principal is rejected when it has neither NameIdentifier nor sub.
    [Fact]
    public void Constructor_WhenUserIsMissingSubjectClaim_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var principal = CreatePrincipal(new Claim(ClaimTypes.Email, "test@example.com"));

        // Act
        var exception = Assert.Throws<UnauthorizedAccessException>(() => CreateUserContext(principal));

        // Assert
        Assert.Equal("The authenticated user is missing a subject claim.", exception.Message);
    }

    private static Auth0UserContext CreateUserContext(ClaimsPrincipal principal)
    {
        var httpContext = new DefaultHttpContext
        {
            User = principal
        };

        return new Auth0UserContext(new HttpContextAccessor
        {
            HttpContext = httpContext
        });
    }

    private static ClaimsPrincipal CreatePrincipal(params Claim[] claims)
    {
        var identity = new ClaimsIdentity(claims, authenticationType: "Test");
        return new ClaimsPrincipal(identity);
    }
}
