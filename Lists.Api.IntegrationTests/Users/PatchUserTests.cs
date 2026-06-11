using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PatchUserTests : EndpointTestBase
{
    public PatchUserTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies username updates are accepted and stored in normalised lowercase form.
    [Fact]
    public async Task PatchUser_WhenAuthenticated_UpdatesUsernameAndNormalisesCasing()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, auth0UserId);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            auth0UserId,
            new { Username = "Josh_User" });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();
        user.Username.Should().Be("josh_user");
        user.NeedsUsername.Should().BeFalse();
    }

    // Verifies users can save their existing username without tripping the uniqueness check.
    [Fact]
    public async Task PatchUser_WhenUsernameBelongsToCurrentUser_ReturnsOk()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, "josh_user");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            auth0UserId,
            new { Username = "Josh_User" });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();
        user.Username.Should().Be("josh_user");
        user.NeedsUsername.Should().BeFalse();
    }

    // Verifies DTO validation rejects malformed usernames before they are saved.
    [Theory]
    // Too short, too long, starts with underscore, contains invalid character.
    [InlineData("a")]
    [InlineData("this-is-a-very-long-username-that-exceeds-the-maximum-length")]
    [InlineData("_josh")]
    [InlineData("josh!")]
    public async Task PatchUser_WhenUsernameIsInvalid_ReturnsBadRequest(string username)
    {
        // Arrange
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            CreateAuth0UserId(),
            new { Username = username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies usernames are unique after normalisation.
    [Fact]
    public async Task PatchUser_WhenUsernameIsTaken_ReturnsConflict()
    {
        // Arrange
        var username = CreateUsername();

        var existingAuth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, existingAuth0UserId);
        await UpdateUsernameAsync(existingAuth0UserId, username);

        var auth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, auth0UserId);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            auth0UserId,
            new { Username = username.ToUpperInvariant() });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Username is already taken.");
    }

    private async Task<UserDto> UpdateUsernameAsync(string auth0UserId, string username)
    {
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            auth0UserId,
            new { Username = username });

        using var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();

        return user;
    }
}
