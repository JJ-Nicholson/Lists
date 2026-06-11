using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class GetListTests : EndpointTestBase
{
    public GetListTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies a specific owned list can be read with the documented empty-items detail shape.
    [Fact]
    public async Task GetList_WhenListExists_ReturnsEmptyListDetails()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries", "NZD");
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var listPage = await response.Content.ReadFromJsonAsync<ListDetailsDto>();
        listPage.Should().NotBeNull();
        listPage.Id.Should().Be(list.Id);
        listPage.Name.Should().Be("Groceries");
        listPage.UnitLabel.Should().Be("NZD");
        listPage.Version.Should().Be(list.Version);
        listPage.Items.Should().BeEmpty();
        listPage.TotalAmount.Should().Be(0);
    }

    // Verifies list details return all matching items.
    [Fact]
    public async Task GetList_WhenItemsMatchFilters_ReturnsMatchingItems()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        await SeedItemAsync(factory, list, "Milk", 4.50m);
        await SeedItemAsync(factory, list, "Bread", 3.25m);
        await SeedItemAsync(factory, list, "Muesli", 8.10m, isCompleted: true);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Get,
            $"/lists/{list.Id}?status=active&sortBy=amount&sortDirection=desc&page=1&pageSize=1",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var listDetails = await response.Content.ReadFromJsonAsync<ListDetailsDto>();
        listDetails.Should().NotBeNull();
        listDetails.Items.Select(i => i.Name).Should().Equal("Milk", "Bread");
        listDetails.Items.Should().OnlyContain(i => !i.IsCompleted);
        listDetails.TotalAmount.Should().Be(7.75m);
    }

    // Verifies reading a missing list returns not found.
    [Fact]
    public async Task GetList_WhenListDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/lists/1", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies another user's list is hidden behind not found instead of leaking existence.
    [Fact]
    public async Task GetList_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies invalid item query parameters on list details return clear bad request responses.
    [Theory]
    [InlineData("status=lost", "Invalid item status.")]
    [InlineData("sortBy=version", "Invalid item sort.")]
    [InlineData("sortDirection=sideways", "Invalid item sort direction.")]
    public async Task GetList_WhenQueryIsInvalid_ReturnsBadRequest(string queryString, string message)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedRequest(
            HttpMethod.Get,
            $"/lists/{list.Id}?{queryString}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain(message);
    }

    // Verifies list details reject accounts that have not chosen a username yet.
    [Fact]
    public async Task GetList_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Get, "/lists/1", null);
    }
}
