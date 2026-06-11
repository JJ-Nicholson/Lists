using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class GetListAccessTests : EndpointTestBase
{
    public GetListAccessTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies access details reject accounts that have not chosen a username yet.
    [Fact]
    public async Task GetListAccess_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Get, "/lists/1/access", null);
    }
}
