using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class MarkItemsCompleteTests : EndpointTestBase
{
    public MarkItemsCompleteTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies bulk completion updates multiple items and returns them in the requested order.
    [Fact]
    public async Task MarkItemsComplete_WhenVersionsAreCurrent_UpdatesItemsInRequestedOrder()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var milk = await SeedItemAsync(factory, list, "Milk", 4.50m);
        var bread = await SeedItemAsync(factory, list, "Bread", 3.25m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-complete",
            auth0UserId,
            new
            {
                Items = new[]
                {
                    new { Id = bread.Id, Version = bread.Version },
                    new { Id = milk.Id, Version = milk.Version }
                }
            });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemDto>>();
        items.Should().NotBeNull();
        items.Select(i => i.Id).Should().Equal(bread.Id, milk.Id);
        items.Should().OnlyContain(i => i.IsCompleted);
    }

    // Verifies bulk completion rejects duplicate item ids before applying updates.
    [Fact]
    public async Task MarkItemsComplete_WhenDuplicateIdsAreRequested_ReturnsBadRequest()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-complete",
            auth0UserId,
            new
            {
                Items = new[]
                {
                    new { Id = item.Id, Version = item.Version },
                    new { Id = item.Id, Version = item.Version }
                }
            });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Duplicate item ids are not allowed.");
    }

    // Verifies bulk completion returns not found when any requested item does not belong to the list.
    [Fact]
    public async Task MarkItemsComplete_WhenAnyItemIsMissing_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var item = await SeedItemAsync(factory, list, "Milk", 4.50m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-complete",
            auth0UserId,
            new
            {
                Items = new[]
                {
                    new { Id = item.Id, Version = item.Version },
                    new { Id = 123, Version = 1u }
                }
            });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies bulk completion rejects stale optimistic concurrency versions.
    [Fact]
    public async Task MarkItemsComplete_WhenAnyVersionIsStale_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var milk = await SeedItemAsync(factory, list, "Milk", 4.50m);
        var bread = await SeedItemAsync(factory, list, "Bread", 3.25m);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-complete",
            auth0UserId,
            new
            {
                Items = new[]
                {
                    new { Id = milk.Id, Version = milk.Version },
                    new { Id = bread.Id, Version = 0u }
                }
            });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("One or more items were modified. Reload and try again.");
    }

    // Verifies bulk completion rejects requests where an item is already in the target state.
    [Fact]
    public async Task MarkItemsComplete_WhenAnyItemIsAlreadyComplete_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var milk = await SeedItemAsync(factory, list, "Milk", 4.50m);
        var bread = await SeedItemAsync(factory, list, "Bread", 3.25m, isCompleted: true);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-complete",
            auth0UserId,
            new
            {
                Items = new[]
                {
                    new { Id = milk.Id, Version = milk.Version },
                    new { Id = bread.Id, Version = bread.Version }
                }
            });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("One or more items are already complete. Reload and try again.");
    }

    // Verifies bulk completion rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task MarkItemsComplete_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Patch,
            "/lists/1/items/mark-complete",
            new { Items = new[] { new { Id = 1, Version = 1u } } });
    }
}
