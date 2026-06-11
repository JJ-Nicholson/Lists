using System.Net;
using System.Net.Http.Json;

using FluentAssertions;

using Lists.Api.Dtos;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class PostListsTests : EndpointTestBase
{
    private const string TooLongListName =
        "this-list-name-is-far-too-long-because-it-keeps-going-past-the-one-hundred-character-limit-for-list-validation";
    private const string TooLongUnitLabel = "this-unit-label-is-far-too-long";

    public PostListsTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
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

    // Verifies list creation rejects accounts that have not chosen a username yet.
    [Fact]
    public async Task PostLists_WhenAccountNeedsUsername_ReturnsConflict()
    {
        await AssertAccountNeedsUsernameAsync(HttpMethod.Post, "/lists", new { Name = "Groceries" });
    }
}
