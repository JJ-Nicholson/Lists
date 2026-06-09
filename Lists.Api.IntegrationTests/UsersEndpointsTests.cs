using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class UsersEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    private readonly ListsWebApplicationFactory factory;
    private readonly HttpClient client;

    public UsersEndpointsTests(ListsWebApplicationFactory factory)
    {
        this.factory = factory;
        client = factory.CreateClient();
    }

    public Task InitializeAsync()
    {
        return factory.ResetDatabaseAsync();
    }

    public Task DisposeAsync()
    {
        client.Dispose();
        return Task.CompletedTask;
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

    // Verifies deleting a user removes the current user record and a later lookup creates a fresh user.
    [Fact]
    public async Task DeleteUser_WhenAuthenticated_RemovesCurrentUser()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, auth0UserId);
        await UpdateUsernameAsync(auth0UserId, CreateUsername());

        using var deleteRequest = CreateAuthenticatedRequest(HttpMethod.Delete, "/user", auth0UserId);

        // Act
        using var deleteResponse = await client.SendAsync(deleteRequest);

        // Assert
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        factory.GetDeletedAuth0UserIds().Should().Equal(auth0UserId);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, "/user", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await getResponse.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();
        user.Username.Should().BeNull();
        user.NeedsUsername.Should().BeTrue();
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
