using System.Net;

using FluentAssertions;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class DeleteListTests : EndpointTestBase
{
    public DeleteListTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies list deletion rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task DeleteList_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Delete, "/lists/1?version=1", null);
    }
}
