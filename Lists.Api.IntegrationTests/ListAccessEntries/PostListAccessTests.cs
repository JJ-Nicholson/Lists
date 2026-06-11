using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PostListAccessTests : EndpointTestBase
{
    private const string TooLongUsername =
        "this-is-a-very-long-username-that-exceeds-the-maximum-length";

    public PostListAccessTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies grant access rejects malformed target usernames before lookup.
    [Theory]
    [InlineData("")]
    [InlineData("a")]
    [InlineData("_missing_user")]
    [InlineData("missing user")]
    [InlineData(TooLongUsername)]
    public async Task PostListAccess_WhenTargetUsernameIsInvalid_ReturnsBadRequest(string username)
    {
        // Arrange
        var ownerAuth0UserId = CreateAuth0UserId();
        var owner = await SeedUserAsync(factory, ownerAuth0UserId, CreateUsername());
        var list = await SeedListAsync(factory, owner, "Groceries");

        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Post,
            $"/lists/{list.Id}/access",
            ownerAuth0UserId,
            new { Username = username });

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // Verifies grant access rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task PostListAccess_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Post,
            "/lists/1/access",
            new { Username = "target_user" });
    }
}
