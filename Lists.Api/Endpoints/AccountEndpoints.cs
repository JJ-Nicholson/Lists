using Microsoft.EntityFrameworkCore;
using Lists.Api.Data;
using Lists.Api.Dtos;
using Lists.Api.Models;
using Lists.Api.Services;

namespace Lists.Api.Endpoints;

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this WebApplication app, ILogger logger)
    {
        var accountGroup = app.MapGroup("/account").RequireAuthorization();

        // GET /account (Get or create the authenticated user's account)
        accountGroup.MapGet("/", async (
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var user = await accountService.GetOrCreateCurrentUserAsync(cancellationToken);

            return Results.Ok(ToAccountDto(user.Username));
        });

        // PATCH /account (Update the authenticated user's username)
        accountGroup.MapPatch("/", async (
            UpdateAccountDto dto,
            IAccountService accountService,
            ListsContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var user = await accountService.GetOrCreateCurrentUserAsync(cancellationToken);
            var username = dto.Username.Trim().ToLowerInvariant();

            var isUsernameTaken = await dbContext.Users.AnyAsync(u =>
                u.Id != user.Id &&
                u.Username == username,
                cancellationToken);

            if (isUsernameTaken)
            {
                return Results.Conflict(new { message = "Username is already taken." });
            }

            user.Username = username;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException exception)
            {
                // Handles a race where another request takes the username after the pre-check.
                logger.LogWarning(exception, "Username update conflicted for account {UserId}.", user.Id);
                return Results.Conflict(new { message = "Username is already taken." });
            }

            logger.LogInformation("Updated username for account {UserId}.", user.Id);

            return Results.Ok(ToAccountDto(user.Username));
        });

        // DELETE /account (Delete the authenticated user's account and all their owned lists)
        accountGroup.MapDelete("/", async (
            IAccountService accountService,
            ListsContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var user = await accountService.GetOrCreateCurrentUserAsync(cancellationToken);

            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var ownedListIds = dbContext.ListAccesses
                .Where(a => a.UserId == user.Id && a.Role == ListAccessRole.Owner)
                .Select(a => a.ListId);

            var deletedListCount = await dbContext.Lists
                .Where(l => ownedListIds.Contains(l.Id))
                .ExecuteDeleteAsync(cancellationToken);

            await dbContext.Users
                .Where(u => u.Id == user.Id)
                .ExecuteDeleteAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            logger.LogInformation("Deleted account {UserId} and {DeletedListCount} owned lists.", user.Id, deletedListCount);

            return Results.NoContent();
        });
    }

    private static AccountDto ToAccountDto(string? username) =>
        new(
            username,
            string.IsNullOrWhiteSpace(username)
        );
}
