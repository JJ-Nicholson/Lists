using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class MarkItemsIncompleteTests : EndpointTestBase
{
    public MarkItemsIncompleteTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies bulk incompletion rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task MarkItemsIncomplete_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Patch,
            "/lists/1/items/mark-incomplete",
            new { Items = new[] { new { Id = 1, Version = 1u } } });
    }
}
