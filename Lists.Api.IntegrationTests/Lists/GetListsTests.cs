using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class GetListsTests : EndpointTestBase
{
    public GetListsTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies an authenticated user with no lists receives the documented empty page shape.
    [Fact]
    public async Task GetLists_WhenUserHasNoLists_ReturnsEmptyPage()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/lists", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page = await response.Content.ReadFromJsonAsync<ListsPageDto>();
        page.Should().NotBeNull();
        page.Lists.Should().BeEmpty();
        page.Page.Page.Should().Be(1);
        page.Page.PageSize.Should().Be(12);
        page.Page.TotalCount.Should().Be(0);
        page.Page.TotalPages.Should().Be(0);
    }

    // Verifies list search, descending name ordering, and pagination metadata work together.
    [Fact]
    public async Task GetLists_WhenSearchSortDirectionAndPaginationAreSpecified_ReturnsMatchingPage()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());

        await SeedListAsync(factory, currentUser, "Alpha Groceries");
        await SeedListAsync(factory, currentUser, "Beta Hardware");
        await SeedListAsync(factory, currentUser, "Gamma Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Get,
            "/lists?search=groceries&sortDirection=desc&page=1&pageSize=1",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page = await response.Content.ReadFromJsonAsync<ListsPageDto>();
        page.Should().NotBeNull();
        page.Lists.Should().ContainSingle();
        page.Lists[0].Name.Should().Be("Gamma Groceries");
        page.Page.Page.Should().Be(1);
        page.Page.PageSize.Should().Be(1);
        page.Page.TotalCount.Should().Be(2);
        page.Page.TotalPages.Should().Be(2);
    }

    // Verifies list collection results do not include lists owned only by another user.
    [Fact]
    public async Task GetLists_WhenOtherUserOwnsList_DoesNotReturnIt()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        await SeedListAsync(factory, otherUser, "Someone Else's Groceries");
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/lists", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page = await response.Content.ReadFromJsonAsync<ListsPageDto>();
        page.Should().NotBeNull();
        page.Lists.Should().BeEmpty();
        page.Page.TotalCount.Should().Be(0);
    }

    // Verifies list collection results include lists shared with the current user.
    [Fact]
    public async Task GetLists_WhenUserHasAccessToSharedList_ReturnsSharedList()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Shared Groceries", "NZD");
        await SeedListAccessAsync(factory, list, currentUser);

        using var request = CreateAuthenticatedRequest(HttpMethod.Get, "/lists", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var page = await response.Content.ReadFromJsonAsync<ListsPageDto>();
        page.Should().NotBeNull();
        var sharedList = page.Lists.Should().ContainSingle().Which;
        sharedList.Id.Should().Be(list.Id);
        sharedList.Name.Should().Be("Shared Groceries");
        sharedList.UnitLabel.Should().Be("NZD");
        sharedList.CurrentUserRole.Should().Be("editor");
        sharedList.OwnerUsername.Should().Be(owner.Username);
    }

    // Verifies invalid list collection query parameters return clear bad request responses.
    [Theory]
    [InlineData("/lists?page=0", "Page must be 1 or greater.")]
    [InlineData("/lists?pageSize=0", "Page size must be between 1 and 1000.")]
    [InlineData("/lists?sortDirection=sideways", "Invalid list sort direction.")]
    public async Task GetLists_WhenQueryIsInvalid_ReturnsBadRequest(string requestUri, string message)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedRequest(HttpMethod.Get, requestUri, auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain(message);
    }

    // Verifies list collection rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task GetLists_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Get, "/lists", null);
    }
}
