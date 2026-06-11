using System.Net;

using FluentAssertions;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class DeleteListAccessTests : EndpointTestBase
{
    public DeleteListAccessTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies a list owner can revoke another user's access.
    [Fact]
    public async Task DeleteListAccess_WhenCurrentUserIsOwner_RemovesAccess()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var targetAuth0UserId = CreateAuth0UserId();
        var targetUser = await SeedUserAsync(factory, targetAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");
        await SeedListAccessAsync(factory, list, targetUser);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/{targetUser.Username!.ToUpperInvariant()}",
            ownerAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, $"/lists/{list.Id}", targetAuth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies revoke access requires owner permissions for accessible lists.
    [Fact]
    public async Task DeleteListAccess_WhenCurrentUserIsEditor_ReturnsForbidden()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var editorAuth0UserId = CreateAuth0UserId();
        var editor = await SeedUserAsync(factory, editorAuth0UserId, CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");
        await SeedListAccessAsync(factory, list, editor);
        await SeedListAccessAsync(factory, list, targetUser);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/{targetUser.Username}",
            editorAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // Verifies revoke access hides inaccessible lists behind not found.
    [Fact]
    public async Task DeleteListAccess_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Someone Else's Groceries");
        await SeedListAccessAsync(factory, list, targetUser);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/{targetUser.Username}",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies revoke access rejects unknown target usernames.
    [Fact]
    public async Task DeleteListAccess_WhenTargetUserDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/missing_user",
            ownerAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies revoke access returns a clear response when the target user has no list access.
    [Fact]
    public async Task DeleteListAccess_WhenTargetUserDoesNotHaveAccess_ReturnsNotFound()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/{targetUser.Username}",
            ownerAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain($"User with username '{targetUser.Username}' does not have access to the list.");
    }

    // Verifies list owners cannot revoke their own owner access entry.
    [Fact]
    public async Task DeleteListAccess_WhenOwnerTargetsSelf_ReturnsConflict()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Delete,
            $"/lists/{list.Id}/access/{owner.Username}",
            ownerAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Owner cannot remove themselves.");
    }

    // Verifies revoke access rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task DeleteListAccess_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Delete, "/lists/1/access/target_user", null);
    }
}
