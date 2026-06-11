using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PostItemTests : EndpointTestBase
{
    public PostItemTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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
            new { Name = "Milk", Amount = 4.50m });

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

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListDetailsDto>();
        listPage.Should().NotBeNull();
        var createdItem = listPage.Items.Should().ContainSingle().Which;
        createdItem.Name.Should().Be("Milk");
        createdItem.Amount.Should().Be(4.50m);
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
            new { Name = "Milk", Amount = 4.50m });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var listPage = await getResponse.Content.ReadFromJsonAsync<ListDetailsDto>();
        listPage.Should().NotBeNull();
        listPage.Items.Should().ContainSingle(i => i.Name == "Milk" && i.Amount == 4.50m);
    }

    // Verifies item creation rejects invalid item payloads through DTO validation.
    [Theory]
    [InlineData("", 1)]
    [InlineData("Milk", -100000000)]
    public async Task PostItem_WhenPayloadIsInvalid_ReturnsBadRequest(string name, decimal amount)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/items",
            auth0UserId,
            new { Name = name, Amount = amount });

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
            new { Name = "Milk", Amount = 4.50m });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies item creation rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task PostItem_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Post,
            "/lists/1/items",
            new { Name = "Milk", Amount = 4.50m });
    }
}
