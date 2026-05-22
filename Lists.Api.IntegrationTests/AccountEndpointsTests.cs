using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Lists.Api.Dtos;
using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class AccountEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    private readonly ListsWebApplicationFactory factory;
    private readonly HttpClient client;

    public AccountEndpointsTests(ListsWebApplicationFactory factory)
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

    // Verifies account endpoints require an authenticated user.
    [Fact]
    public async Task GetAccount_WhenUnauthenticated_ReturnsUnauthorized()
    {
        // Act
        using var response = await client.GetAsync("/account");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Verifies the first authenticated account lookup creates an account that still needs a username.
    [Fact]
    public async Task GetAccount_WhenAuthenticated_CreatesAccountThatNeedsUsername()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/account", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Username.Should().BeNull();
        account.NeedsUsername.Should().BeTrue();
    }

    // Verifies username updates are accepted and stored in normalised lowercase form.
    [Fact]
    public async Task PatchAccount_WhenAuthenticated_UpdatesUsernameAndNormalisesCasing()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            auth0UserId,
            new { Username = "Josh_User" });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Username.Should().Be("josh_user");
        account.NeedsUsername.Should().BeFalse();
    }

    // Verifies DTO validation rejects malformed usernames before they are saved.
    [Theory]
    // Too short, too long, starts with underscore, contains invalid character.
    [InlineData("a")]
    [InlineData("this-is-a-very-long-username-that-exceeds-the-maximum-length")]
    [InlineData("_josh")]
    [InlineData("josh!")]
    public async Task PatchAccount_WhenUsernameIsInvalid_ReturnsBadRequest(string username)
    {
        // Arrange
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            CreateAuth0UserId(),
            new { Username = username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies usernames are unique after normalisation.
    [Fact]
    public async Task PatchAccount_WhenUsernameIsTaken_ReturnsConflict()
    {
        // Arrange
        var username = CreateUsername();

        await UpdateUsernameAsync(CreateAuth0UserId(), username);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            CreateAuth0UserId(),
            new { Username = username.ToUpperInvariant() });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Username is already taken.");
    }

    // Verifies deleting an account removes the current user record and a later lookup creates a fresh account.
    [Fact]
    public async Task DeleteAccount_WhenAuthenticated_RemovesCurrentUser()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await UpdateUsernameAsync(auth0UserId, CreateUsername());

        using var deleteRequest = CreateAuthenticatedRequest(HttpMethod.Delete, "/account", auth0UserId);

        // Act
        using var deleteResponse = await client.SendAsync(deleteRequest);

        // Assert
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, "/account", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await getResponse.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Username.Should().BeNull();
        account.NeedsUsername.Should().BeTrue();
    }

    private async Task<AccountDto> UpdateUsernameAsync(string auth0UserId, string username)
    {
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            auth0UserId,
            new { Username = username });

        using var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();

        return account!;
    }
}
