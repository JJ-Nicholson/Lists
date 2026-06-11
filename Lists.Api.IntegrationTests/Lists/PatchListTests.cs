using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PatchListTests : EndpointTestBase
{
    private const string TooLongListName =
        "this-list-name-is-far-too-long-because-it-keeps-going-past-the-one-hundred-character-limit-for-list-validation";
    private const string TooLongUnitLabel = "this-unit-label-is-far-too-long";

    public PatchListTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies list updates reject accounts that have not chosen a username yet.
    [Fact]
    public async Task PatchList_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(
            HttpMethod.Patch,
            "/lists/1",
            new { Name = "Groceries", Version = 1u });
    }
}
