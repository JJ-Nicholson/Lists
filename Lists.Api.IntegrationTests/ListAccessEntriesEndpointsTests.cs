using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class ListAccessEntriesEndpointsTests : IClassFixture<ListsWebApplicationFactory>, IAsyncLifetime
{
    private readonly ListsWebApplicationFactory factory;
    private readonly HttpClient client;

    public ListAccessEntriesEndpointsTests(ListsWebApplicationFactory factory)
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

    // Verifies an accessible list returns the users and roles with access.
    [Fact]
    public async Task GetListAccess_WhenListIsAccessible_ReturnsAccessEntries()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var editorAuth0UserId = CreateAuth0UserId();
        var editor = await SeedUserAsync(factory, editorAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");
        await SeedListAccessAsync(factory, list, editor);

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Get,
            $"/lists/{list.Id}/access",
            editorAuth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var accessEntries = await response.Content.ReadFromJsonAsync<IReadOnlyList<ListAccessEntryDto>>();
        accessEntries.Should().NotBeNull();
        accessEntries.Should().Contain(e => e.Username == owner.Username && e.Role == "owner");
        accessEntries.Should().Contain(e => e.Username == editor.Username && e.Role == "editor");
    }

    // Verifies list access details hide inaccessible lists behind not found.
    [Fact]
    public async Task GetListAccess_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var otherUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, otherUser, "Someone Else's Groceries");

        using var request = CreateAuthenticatedRequest(
            HttpMethod.Get,
            $"/lists/{list.Id}/access",
            auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies a list owner can grant editor access to another user.
    [Fact]
    public async Task PostListAccess_WhenCurrentUserIsOwner_GrantsAccess()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            ownerAuth0UserId,
            new { Username = targetUser.Username!.ToUpperInvariant() });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var getRequest = CreateAuthenticatedRequest(
            HttpMethod.Get,
            $"/lists/{list.Id}/access",
            ownerAuth0UserId);
        using var getResponse = await client.SendAsync(getRequest);
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var accessEntries = await getResponse.Content.ReadFromJsonAsync<IReadOnlyList<ListAccessEntryDto>>();
        accessEntries.Should().NotBeNull();
        accessEntries.Should().Contain(e => e.Username == targetUser.Username && e.Role == "editor");
    }

    // Verifies grant access rejects duplicate access entries.
    [Fact]
    public async Task PostListAccess_WhenTargetUserAlreadyHasAccess_ReturnsConflict()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");
        await SeedListAccessAsync(factory, list, targetUser);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            ownerAuth0UserId,
            new { Username = targetUser.Username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("User already has access.");
    }

    // Verifies grant access hides inaccessible lists behind not found.
    [Fact]
    public async Task PostListAccess_WhenOtherUserOwnsList_ReturnsNotFound()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserAsync(factory, auth0UserId, CreateUsername());
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Someone Else's Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            auth0UserId,
            new { Username = targetUser.Username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // Verifies grant access requires owner permissions for accessible lists.
    [Fact]
    public async Task PostListAccess_WhenCurrentUserIsEditor_ReturnsForbidden()
    {
        // Arrange
        var owner = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var editorAuth0UserId = CreateAuth0UserId();
        var editor = await SeedUserAsync(factory, editorAuth0UserId, CreateUsername());
        var targetUser = await SeedUserAsync(factory, CreateAuth0UserId(), CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");
        await SeedListAccessAsync(factory, list, editor);

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            editorAuth0UserId,
            new { Username = targetUser.Username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // Verifies grant access rejects unknown target usernames.
    [Fact]
    public async Task PostListAccess_WhenTargetUserDoesNotExist_ReturnsNotFound()
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            ownerAuth0UserId,
            new { Username = "missing_user" });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
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

    // Verifies access endpoints reject accounts that have not chosen a username yet.
    [Theory]
    [MemberData(nameof(ListAccessRequestsRequiringUsername))]
    public async Task ListAccessEndpoint_WhenAccountNeedsUsername_ReturnsConflict(
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

    public static TheoryData<HttpMethod, string, object?> ListAccessRequestsRequiringUsername() => new()
    {
        { HttpMethod.Get, "/lists/1/access", null },
        { HttpMethod.Post, "/lists/1/access", new { Username = "target_user" } },
        { HttpMethod.Delete, "/lists/1/access/target_user", null }
    };
}
