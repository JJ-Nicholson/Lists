using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

using FluentAssertions;
using Microsoft.Extensions.Logging;

using Lists.Api.Dtos;
using Lists.Api.Errors;
using Lists.Api.Services.Users;

using static Lists.Api.IntegrationTests.IntegrationTestHelpers;

namespace Lists.Api.IntegrationTests;

public class DeleteUserTests : EndpointTestBase
{
    public DeleteUserTests(ListsWebApplicationFactory factory)
        : base(factory)
    {
    }

    // Verifies deleting a user removes the current user record and a later lookup creates a fresh user.
    [Fact]
    public async Task DeleteUser_WhenAuthenticated_RemovesCurrentUser()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        await SeedUserWithoutUsernameAsync(factory, auth0UserId);
        await UpdateUsernameAsync(auth0UserId, CreateUsername());

        using var deleteRequest = CreateAuthenticatedRequest(HttpMethod.Delete, "/user", auth0UserId);

        // Act
        using var deleteResponse = await client.SendAsync(deleteRequest);

        // Assert
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        factory.GetDeletedAuth0UserIds().Should().Equal(auth0UserId);

        using var getRequest = CreateAuthenticatedRequest(HttpMethod.Get, "/user", auth0UserId);
        using var getResponse = await client.SendAsync(getRequest);

        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await getResponse.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();
        user.Username.Should().BeNull();
        user.NeedsUsername.Should().BeTrue();
    }

    // Verifies a local deletion failure is identifiable and returned with its stable API error code.
    [Fact]
    public async Task DeleteUser_WhenLocalDeletionFails_LogsUserAndReturnsIncompleteDeletionError()
    {
        // Arrange
        var auth0UserId = CreateAuth0UserId();
        var user = await SeedUserAsync(factory, auth0UserId, CreateUsername());
        factory.FailNextSave();

        using var request = CreateAuthenticatedRequest(HttpMethod.Delete, "/user", auth0UserId);

        // Act
        using var response = await client.SendAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        factory.GetDeletedAuth0UserIds().Should().Equal(auth0UserId);

        var error = await response.Content.ReadFromJsonAsync<JsonElement>();
        error.GetProperty("code").GetString().Should().Be("account_deletion_incomplete");

        var logs = factory.GetLogEntries();
        logs.Should().Contain(entry =>
            entry.Category == typeof(UsersService).FullName &&
            entry.Level == LogLevel.Critical &&
            entry.Message.Contains($"user {user.Id}."));
        logs.Should().Contain(entry =>
            entry.Category == typeof(ApiExceptionHandler).FullName &&
            entry.Level == LogLevel.Error &&
            entry.Exception is AccountDeletionIncompleteException);
    }

    private async Task<UserDto> UpdateUsernameAsync(string auth0UserId, string username)
    {
        using var request = CreateAuthenticatedJsonRequest(
            HttpMethod.Patch,
            "/user",
            auth0UserId,
            new { Username = username });

        using var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var user = await response.Content.ReadFromJsonAsync<UserDto>();
        user.Should().NotBeNull();

        return user;
    }
}
