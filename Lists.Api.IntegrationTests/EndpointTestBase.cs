using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public abstract class EndpointTestBase : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    protected readonly ListsWebApplicationFactory factory;
    protected readonly HttpClient client;

    protected EndpointTestBase(ListsWebApplicationFactory factory)
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

    protected async Task AssertAccountNeedsUsernameAsync(HttpMethod method, string requestUri, object? body)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, auth0UserId);

        using var request = CreateAuthenticatedRequest(method, requestUri, auth0UserId);

        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var responseBody = await response.Content.ReadAsStringAsync();
        responseBody.Should().Contain("Choose a username before using lists.");
    }
}
