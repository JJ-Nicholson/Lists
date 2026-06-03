using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class ListItemsEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    private readonly ListsWebApplicationFactory factory;
    private readonly HttpClient client;

    public ListItemsEndpointsTests(ListsWebApplicationFactory factory)
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

    // Verifies an accessible list can receive a newly created item.
    [Fact]
    public async Task PostItem_WhenListIsAccessible_CreatesItem()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/items",
            auth0UserId,
            new { Name = "Milk", Price = 4.50m });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        response.Headers.Location.Should().BeNull();

        var body = await response.Content.ReadAsStringAsync();
        body.Should().BeEmpty();

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListItemsPageDto>();
        listPage.Should().NotBeNull();
        var createdItem = listPage!.Items.Should().ContainSingle().Which;
        createdItem.Name.Should().Be("Milk");
        createdItem.Price.Should().Be(4.50m);
        createdItem.IsCompleted.Should().BeFalse();
        createdItem.Version.Should().BeGreaterThan(0u);
    }

    // Verifies editors can add items to lists shared with them.
    [Fact]
    public async Task PostItem_WhenUserHasAccessToSharedList_CreatesItem()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Shared Groceries");
        await SeedListAccessAsync(factory, list, currentUser);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/items",
            auth0UserId,
            new { Name = "Milk", Price = 4.50m });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListItemsPageDto>();
        listPage.Should().NotBeNull();
        listPage!.Items.Should().ContainSingle(i => i.Name == "Milk" && i.Price == 4.50m);
    }

    // Verifies item creation rejects invalid item payloads through DTO validation.
    [Theory]
    [InlineData("", 1)]
    [InlineData("Milk", -100000000)]
    public async Task PostItem_WhenPayloadIsInvalid_ReturnsBadRequest(string name, decimal price)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/items",
            auth0UserId,
            new { Name = name, Price = price });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies item creation hides inaccessible lists behind not found.
    [Fact]
    public async Task PostItem_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/items",
            auth0UserId,
            new { Name = "Milk", Price = 4.50m });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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
            new { Name = "Oat Milk", Price = 6.25m, IsCompleted = true, Version = item.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedItem = await response.Content.ReadFromJsonAsync<ItemDto>();
        updatedItem.Should().NotBeNull();
        updatedItem!.Id.Should().Be(item.Id);
        updatedItem.Name.Should().Be("Oat Milk");
        updatedItem.Price.Should().Be(6.25m);
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
            new { Name = "Oat Milk", Price = 6.25m, IsCompleted = true, Version = 0u });

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
            new { Name = "Oat Milk", Price = 6.25m, IsCompleted = true, Version = item.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListItemsPageDto>();
        listPage.Should().NotBeNull();
        listPage!.Items.Should().BeEmpty();
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
        items!.Select(i => i.Id).Should().Equal(bread.Id, milk.Id);
        items.Should().OnlyContain(i => i.IsCompleted);
    }

    // Verifies marking multiple completed items incomplete.
    [Fact]
    public async Task MarkItemsIncomplete_WhenVersionsAreCurrent_UpdatesItems()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        var milk = await SeedItemAsync(factory, list, "Milk", 4.50m, isCompleted: true);
        var bread = await SeedItemAsync(factory, list, "Bread", 3.25m, isCompleted: true);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}/items/mark-incomplete",
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
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var items = await response.Content.ReadFromJsonAsync<IReadOnlyList<ItemDto>>();
        items.Should().NotBeNull();
        items.Should().OnlyContain(i => !i.IsCompleted);
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

    // Verifies list item endpoints reject accounts that have not chosen a username yet.
    [Theory]
    [MemberData(nameof(ListItemRequestsRequiringUsername))]
    public async Task ListItemEndpoint_WhenAccountNeedsUsername_ReturnsConflict(
        HttpMethod method,
        string requestUri,
        object? body)
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

    public static TheoryData<HttpMethod, string, object?> ListItemRequestsRequiringUsername() => new()
    {
        { HttpMethod.Post, "/lists/1/items", new { Name = "Milk", Price = 4.50m } },
        {
            HttpMethod.Patch,
            "/lists/1/items/1",
            new { Name = "Milk", Price = 4.50m, IsCompleted = true, Version = 1u }
        },
        { HttpMethod.Delete, "/lists/1/items/1?version=1", null },
        { HttpMethod.Patch, "/lists/1/items/mark-complete", new { Items = new[] { new { Id = 1, Version = 1u } } } },
        { HttpMethod.Patch, "/lists/1/items/mark-incomplete", new { Items = new[] { new { Id = 1, Version = 1u } } } }
    };
}
