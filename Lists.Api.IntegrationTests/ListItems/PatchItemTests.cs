using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PatchItemTests : EndpointTestBase
{
    public PatchItemTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies an accessible item can be updated when the client sends the current version.
    [Fact]
    public async Task PatchItem_WhenVersionIsCurrent_UpdatesItem()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/{item.Id}",
            auth0UserId,
            new { Name = "Oat Milk", Amount = 6.25m, IsCompleted = true, Version = item.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedItem = await response.Content.ReadFromJsonAsync<ItemDto>();
        updatedItem.Should().NotBeNull();
        updatedItem.Id.Should().Be(item.Id);
        updatedItem.Name.Should().Be("Oat Milk");
        updatedItem.Amount.Should().Be(6.25m);
        updatedItem.IsCompleted.Should().BeTrue();
    }

    // Verifies item updates reject stale optimistic concurrency versions.
    [Fact]
    public async Task PatchItem_WhenVersionIsStale_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/{item.Id}",
            auth0UserId,
            new { Name = "Oat Milk", Amount = 6.25m, IsCompleted = true, Version = 0u });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Item was modified. Reload and try again.");
    }

    // Verifies item updates hide inaccessible lists behind not found.
    [Fact]
    public async Task PatchItem_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/{item.Id}",
            auth0UserId,
            new { Name = "Oat Milk", Amount = 6.25m, IsCompleted = true, Version = item.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies item updates reject accounts that have not chosen a username yet.
    [Fact]
    public async Task PatchItem_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Patch,
            "/lists/1/items/1",
            new { Name = "Milk", Amount = 4.50m, IsCompleted = true, Version = 1u });
    }
}
