using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

namespace Lists.Api.IntegrationTests;

public class HealthEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IDisposable
{
    private readonly HttpClient client;

    public HealthEndpointsTests(ListsWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    public void Dispose()
    {
        client.Dispose();
    }

    // Verifies the health endpoint can be called without authentication.
    [Fact]
    public async Task GetHealth_WhenUnauthenticated_ReturnsHealthy()
    {
        // Act
        using var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var health = await response.Content.ReadFromJsonAsync<HealthResponse>();
        health.Should().NotBeNull();
        health.Status.Should().Be("Healthy");
        health.CheckedAt.Should().NotBe(default);
    }

    private sealed record HealthResponse(string Status, DateTimeOffset CheckedAt);
}
