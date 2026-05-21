using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Lists.Api.Dtos;

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

    [Fact]
    public async Task GetAccount_WhenUnauthenticated_ReturnsUnauthorized()
    {
        using var response = await client.GetAsync("/account");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAccount_WhenAuthenticated_CreatesAccountThatNeedsUsername()
    {
        var auth0UserId = CreateAuth0UserId();
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/account", auth0UserId);

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Username.Should().BeNull();
        account.NeedsUsername.Should().BeTrue();
    }

    [Fact]
    public async Task PatchAccount_WhenAuthenticated_UpdatesUsernameAndNormalizesCasing()
    {
        var auth0UserId = CreateAuth0UserId();
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            auth0UserId,
            new { Username = "Josh_User" });

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var account = await response.Content.ReadFromJsonAsync<AccountDto>();
        account.Should().NotBeNull();
        account!.Username.Should().Be("josh_user");
        account.NeedsUsername.Should().BeFalse();
    }

    [Fact]
    public async Task PatchAccount_WhenUsernameIsTaken_ReturnsConflict()
    {
        var username = CreateUsername();

        await UpdateUsernameAsync(CreateAuth0UserId(), username);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/account",
            CreateAuth0UserId(),
            new { Username = username.ToUpperInvariant() });

        using var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Username is already taken.");
    }

    [Fact]
    public async Task DeleteAccount_WhenAuthenticated_RemovesCurrentUser()
    {
        var auth0UserId = CreateAuth0UserId();
        await UpdateUsernameAsync(auth0UserId, CreateUsername());

        using var deleteRequest = CreateAuthenticatedRequest(HttpMethod.Delete, "/account", auth0UserId);

        using var deleteResponse = await client.SendAsync(deleteRequest);

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

    private static HttpRequestMessage CreateAuthenticatedRequest(
        HttpMethod method,
        string requestUri,
        string auth0UserId)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Add(IntegrationTestAuthHandler.UserIdHeaderName, auth0UserId);

        return request;
    }

    private static HttpRequestMessage CreateAuthenticatedJsonRequest(
        HttpMethod method,
        string requestUri,
        string auth0UserId,
        object body)
    {
        var request = CreateAuthenticatedRequest(method, requestUri, auth0UserId);
        request.Content = JsonContent.Create(body);

        return request;
    }

    private static string CreateAuth0UserId()
    {
        return $"auth0|{Guid.NewGuid()}";
    }

    private static string CreateUsername()
    {
        return $"user{Guid.NewGuid()}";
    }
}
