using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class GetUserTests : EndpointTestBase
{
    public GetUserTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies user endpoints require an authenticated user.
    [Fact]
    public async Task GetUser_WhenUnauthenticated_ReturnsUnauthorized()
    {
        // Act
        using var response = await client.GetAsync("/user");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Verifies the first authenticated user lookup creates a user that still needs a username.
    [Fact]
    public async Task GetUser_WhenAuthenticated_CreatesUserThatNeedsUsername()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/user", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();
        user.Username.Should().BeNull();
        user.NeedsUsername.Should().BeTrue();
    }
}
