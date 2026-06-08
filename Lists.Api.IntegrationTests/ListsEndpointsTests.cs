using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class ListsEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    private const string TooLongListName =
        "this-list-name-is-far-too-long-because-it-keeps-going-past-the-one-hundred-character-limit-for-list-validation";
    private const string TooLongUnitLabel = "this-unit-label-is-far-too-long";

    private readonly ListsWebApplicationFactory factory;
    private readonly HttpClient client;

    public ListsEndpointsTests(ListsWebApplicationFactory factory)
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
        page.Page.PageSize.Should().Be(96);
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
        var sharedList = page!.Lists.Should().ContainSingle().Which;
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
        listDetails!.Items.Select(i => i.Name).Should().Equal("Milk", "Bread");
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

    // Verifies an authenticated user can create a new owned list.
    [Fact]
    public async Task PostLists_WhenAuthenticated_CreatesOwnedList()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            "/lists",
            auth0UserId,
            new { Name = "Groceries", UnitLabel = " NZD " });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var list = await response.Content.ReadFromJsonAsync<ListDto>();
        list.Should().NotBeNull();
        list.Name.Should().Be("Groceries");
        list.UnitLabel.Should().Be("NZD");
        list.Items.Should().BeEmpty();
    }

    // Verifies null and whitespace-only unit labels are normalised to null on creation.
    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    public async Task PostLists_WhenUnitLabelIsNullOrWhiteSpace_ReturnsNullUnitLabel(string? unitLabel)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            "/lists",
            auth0UserId,
            new { Name = "Groceries", UnitLabel = unitLabel });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var list = await response.Content.ReadFromJsonAsync<ListDto>();
        list.Should().NotBeNull();
        list.UnitLabel.Should().BeNull();
    }

    // Verifies list creation rejects invalid names through DTO validation.
    [Theory]
    [InlineData("")]
    [InlineData(TooLongListName)]
    public async Task PostLists_WhenNameIsInvalid_ReturnsBadRequest(string name)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            "/lists",
            auth0UserId,
            new { Name = name, UnitLabel = "items" });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies list creation rejects unit labels that are too long through DTO validation.
    [Fact]
    public async Task PostLists_WhenUnitLabelIsTooLong_ReturnsBadRequest()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            "/lists",
            auth0UserId,
            new { Name = "Groceries", UnitLabel = TooLongUnitLabel });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies an owned list can be updated when the client sends the current version.
    [Fact]
    public async Task PatchList_WhenVersionIsCurrent_UpdatesList()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = "Weekend Groceries", UnitLabel = "items", Version = list.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedList = await response.Content.ReadFromJsonAsync<ListDto>();
        updatedList.Should().NotBeNull();
        updatedList.Name.Should().Be("Weekend Groceries");
        updatedList.UnitLabel.Should().Be("items");
    }

    // Verifies null and whitespace-only unit labels clear an existing unit label.
    [Theory]
    [InlineData(null)]
    [InlineData(" ")]
    public async Task PatchList_WhenUnitLabelIsNullOrWhiteSpace_ClearsUnitLabel(string? unitLabel)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries", "NZD");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = "Weekend Groceries", UnitLabel = unitLabel, Version = list.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatedList = await response.Content.ReadFromJsonAsync<ListDto>();
        updatedList.Should().NotBeNull();
        updatedList.UnitLabel.Should().BeNull();
    }

    // Verifies list updates reject stale optimistic concurrency versions.
    [Fact]
    public async Task PatchList_WhenVersionIsStale_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = "Weekend Groceries", UnitLabel = "items", Version = 0u });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("List was modified. Reload and try again.");
    }

    // Verifies another user's list cannot be updated and is hidden behind not found.
    [Fact]
    public async Task PatchList_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = "Weekend Groceries", Version = list.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies list updates reject invalid names through DTO validation.
    [Theory]
    [InlineData("")]
    [InlineData(TooLongListName)]
    public async Task PatchList_WhenNameIsInvalid_ReturnsBadRequest(string name)
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = name, UnitLabel = "items", Version = list.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies list updates reject unit labels that are too long through DTO validation.
    [Fact]
    public async Task PatchList_WhenUnitLabelIsTooLong_ReturnsBadRequest()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            $"/lists/{list.Id}",
            auth0UserId,
            new { Name = "Weekend Groceries", UnitLabel = TooLongUnitLabel, Version = list.Version });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies an owner can delete a list and the list is no longer readable afterwards.
    [Fact]
    public async Task DeleteList_WhenCurrentUserIsOwner_RemovesList()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}?version={list.Version}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies list deletion rejects stale optimistic concurrency versions.
    [Fact]
    public async Task DeleteList_WhenVersionIsStale_ReturnsConflict()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, currentUser, "Groceries");
        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}?version=0",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("List was modified. Reload and try again.");
    }

    // Verifies another user's list cannot be deleted and is hidden behind not found.
    [Fact]
    public async Task DeleteList_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");
        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}?version={list.Version}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies editors can see a shared list but cannot delete it.
    [Fact]
    public async Task DeleteList_WhenCurrentUserIsEditor_ReturnsForbidden()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var auth0UserId = CreateAuth0UserId();
        var currentUser = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Shared Groceries");
        await SeedListAccessAsync(factory, list, currentUser);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}?version={list.Version}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Only list owners can delete lists.");
    }

    // Verifies list endpoints reject accounts that have not chosen a username yet.
    [Theory]
    [MemberData(nameof(ListRequestsRequiringUsername))]
    public async Task ListEndpoint_WhenAccountNeedsUsername_ReturnsConflict(
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

    public static TheoryData<HttpMethod, string, object?> ListRequestsRequiringUsername() => new()
    {
        { HttpMethod.Get, "/lists", null },
        { HttpMethod.Get, "/lists/1", null },
        { HttpMethod.Post, "/lists", new { Name = "Groceries" } },
        { HttpMethod.Patch, "/lists/1", new { Name = "Groceries", Version = 1u } },
        { HttpMethod.Delete, "/lists/1?version=1", null }
    };
}
