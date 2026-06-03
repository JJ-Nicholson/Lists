using System.Net.Http.Json;

using Microsoft.Extensions.DependencyInjection;

using Lists.Api.Data;
using Lists.Api.Models;

namespace Lists.Api.IntegrationTests;

public static class IntegrationTestHelpers
{
    public static async Task<UserEntity> SeedUserAsync(
        ListsWebApplicationFactory factory,
        string auth0UserId,
        string username)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        var user = new UserEntity
        {
            Auth0UserId = auth0UserId,
            Username = username
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return user;
    }

    public static async Task<UserEntity> SeedUserWithoutUsernameAsync(
        ListsWebApplicationFactory factory,
        string auth0UserId)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        var user = new UserEntity
        {
            Auth0UserId = auth0UserId
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();

        return user;
    }

    public static async Task<ListEntity> SeedListAsync(
        ListsWebApplicationFactory factory,
        UserEntity owner,
        string name)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        var list = new ListEntity
        {
            Name = name,
            AccessEntries =
            [
                new ListAccessEntryEntity
                {
                    UserId = owner.Id,
                    Role = ListAccessRole.Owner
                }
            ]
        };

        dbContext.Lists.Add(list);
        await dbContext.SaveChangesAsync();
        await dbContext.Entry(list).ReloadAsync();

        return list;
    }

    public static async Task<ListAccessEntryEntity> SeedListAccessAsync(
        ListsWebApplicationFactory factory,
        ListEntity list,
        UserEntity user,
        ListAccessRole role = ListAccessRole.Editor)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        var accessEntry = new ListAccessEntryEntity
        {
            ListId = list.Id,
            UserId = user.Id,
            Role = role
        };

        dbContext.ListAccesses.Add(accessEntry);
        await dbContext.SaveChangesAsync();

        return accessEntry;
    }

    public static async Task<ListItemEntity> SeedItemAsync(
        ListsWebApplicationFactory factory,
        ListEntity list,
        string name,
        decimal price,
        bool isCompleted = false)
    {
        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        var item = new ListItemEntity
        {
            ListId = list.Id,
            Name = name,
            Price = price,
            IsCompleted = isCompleted
        };

        dbContext.ListItems.Add(item);
        await dbContext.SaveChangesAsync();
        await dbContext.Entry(item).ReloadAsync();

        return item;
    }

    public static HttpRequestMessage CreateAuthenticatedRequest(
        HttpMethod method,
        string requestUri,
        string auth0UserId)
    {
        var request = new HttpRequestMessage(method, requestUri);
        request.Headers.Add(IntegrationTestAuthHandler.UserIdHeaderName, auth0UserId);

        return request;
    }

    public static HttpRequestMessage CreateAuthenticatedJsonRequest(
        HttpMethod method,
        string requestUri,
        string auth0UserId,
        object body)
    {
        var request = CreateAuthenticatedRequest(method, requestUri, auth0UserId);
        request.Content = JsonContent.Create(body);

        return request;
    }

    public static string CreateAuth0UserId()
    {
        return $"auth0|{Guid.NewGuid()}";
    }

    public static string CreateUsername()
    {
        return $"user{Guid.NewGuid()}";
    }
}
