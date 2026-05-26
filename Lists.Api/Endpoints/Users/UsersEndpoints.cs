using Lists.Api.Dtos;
using Lists.Api.Services.Users;

using static Lists.Api.Endpoints.Users.UsersEndpointsDtoMappings;

namespace Lists.Api.Endpoints.Users;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this WebApplication app)
    {
        var usersGroup = app.MapGroup("/user").RequireAuthorization();

        // GET /user (Get or create the authenticated user)
        usersGroup.MapGet("/", async (
            IUsersService userService,
            CancellationToken cancellationToken) =>
        {
            var user = await userService.GetOrCreateCurrentUserEntityAsync(cancellationToken);

            return Results.Ok(ToUserDto(user));
        });

        // PATCH /user (Update the authenticated user's username)
        usersGroup.MapPatch("/", async (
            UpdateUserDto dto,
            IUsersService userService,
            CancellationToken cancellationToken) =>
        {
            var username = dto.Username.Trim().ToLowerInvariant();

            var user = await userService.UpdateCurrentUserEntityAsync(
                username,
                cancellationToken);

            return Results.Ok(ToUserDto(user));
        });

        // DELETE /user (Delete the authenticated user's account and all their owned lists)
        usersGroup.MapDelete("/", async (
            IUsersService userService,
            CancellationToken cancellationToken) =>
        {
            await userService.DeleteCurrentUserEntityAsync(cancellationToken);
            return Results.NoContent();
        });
    }
}
