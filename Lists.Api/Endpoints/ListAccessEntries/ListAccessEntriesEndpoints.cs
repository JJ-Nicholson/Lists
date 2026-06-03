using Lists.Api.Dtos;
using Lists.Api.Services.ListAccessEntries;

using static Lists.Api.Endpoints.ListAccessEntries.ListAccessEntriesEndpointsDtoMappings;

namespace Lists.Api.Endpoints.ListAccessEntries;

public static class ListAccessEntriesEndpoints
{
    public static void MapListAccessEntriesEndpoints(this WebApplication app)
    {
        var accessGroup = app.MapGroup("/lists/{listId}/access").RequireAuthorization();

        // POST /lists/{listId}/access (Grant access to a user for a list)
        accessGroup.MapPost("/", async (
            int listId,
            GrantAccessDto dto,
            IListAccessEntriesService listAccessEntriesService,
            CancellationToken cancellationToken) =>
        {
            await listAccessEntriesService.GrantAccessAsync(listId, dto, cancellationToken);

            return Results.NoContent();
        });

        // GET /lists/{listId}/access (Get all users with access to a list)
        accessGroup.MapGet("/", async (
            int listId,
            IListAccessEntriesService listAccessEntriesService,
            CancellationToken cancellationToken) =>
        {
            var accessEntries = await listAccessEntriesService.GetListAccessEntriesAsync(
                listId,
                cancellationToken);

            return Results.Ok(accessEntries.Select(ToListAccessEntryDto).ToList());
        });

        // DELETE /lists/{listId}/access/{targetUsername} (Revoke access for a user to a list)
        accessGroup.MapDelete("/{targetUsername}", async (
            int listId,
            string targetUsername,
            IListAccessEntriesService listAccessEntriesService,
            CancellationToken cancellationToken) =>
        {
            await listAccessEntriesService.RevokeAccessAsync(listId, targetUsername, cancellationToken);

            return Results.NoContent();
        });
    }
}
