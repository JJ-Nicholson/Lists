using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class DeleteItemTests : EndpointTestBase
{
    public DeleteItemTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies item deletion removes an accessible item when the client sends the current version.
    [Fact]
    public async Task DeleteItem_WhenVersionIsCurrent_RemovesItem()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/items/{item.Id}?version={item.Version}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListDetailsDto>();
        listPage.Should().NotBeNull();
        listPage.Items.Should().BeEmpty();
    }

    // Verifies item deletion is idempotent for missing items.
    [Fact]
    public async Task DeleteItem_WhenItemDoesNotExist_ReturnsNoContent()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/items/123?version=1",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // Verifies item deletion rejects stale optimistic concurrency versions.
    [Fact]
    public async Task DeleteItem_WhenVersionIsStale_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/items/{item.Id}?version=0",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Item was modified. Reload and try again.");
    }

    // Verifies item deletion rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task DeleteItem_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Delete, "/lists/1/items/1?version=1", null);
    }
}
