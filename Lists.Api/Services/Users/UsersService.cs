using Microsoft.EntityFrameworkCore;

using Lists.Api.Errors;
using Lists.Api.Models;
using Lists.Api.Repositories;
using Lists.Api.Services.Auth;

namespace Lists.Api.Services.Users;

public interface IUsersService
{
    Task<UserEntity> GetOrCreateCurrentUserEntityAsync(CancellationToken cancellationToken);
    Task<UserEntity> GetCurrentUserEntityAsync(CancellationToken cancellationToken);
    Task<UserEntity> UpdateCurrentUserEntityAsync(string username, CancellationToken cancellationToken);
    Task DeleteCurrentUserEntityAsync(CancellationToken cancellationToken);
}

public class UsersService(
    IUnitOfWork unitOfWork,
    IUserContext userContext,
    IAuth0ManagementService auth0ManagementService,
    ILogger<UsersService> logger
) : IUsersService
{
    public async Task<UserEntity> GetOrCreateCurrentUserEntityAsync(CancellationToken cancellationToken)
    {
        var user = await unitOfWork.Users.GetUserEntityByAuth0Id(userContext.Auth0UserId, cancellationToken);

        if (user is not null)
        {
            return user;
        }

        user = unitOfWork.Users.CreateUserEntity(new UserEntity
        {
            Auth0UserId = userContext.Auth0UserId,
        });

        await unitOfWork.SaveAsync(cancellationToken);

        logger.LogInformation("Created account {UserId}.", user.Id);

        return user;
    }

    public async Task<UserEntity> GetCurrentUserEntityAsync(CancellationToken cancellationToken)
    {
        var user = await unitOfWork.Users.GetUserEntityByAuth0Id(userContext.Auth0UserId, cancellationToken);

        if (user is null)
        {
            throw new NotFoundException("User not found.");
        }

        return user;
    }

    public async Task<UserEntity> UpdateCurrentUserEntityAsync(string username, CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);

        var conflictingUser = await unitOfWork.Users.GetUserEntityByUsername(username, cancellationToken);

        if (conflictingUser is not null && conflictingUser.Id != user.Id)
        {
            throw new ConflictException("Username is already taken.");
        }

        user.Username = username;

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
            logger.LogInformation("Updated username for account {UserId}.", user.Id);
            return user;
        }
        catch (DbUpdateException exception)
        {
            // Handles a race where another request takes the username after the pre-check.
            logger.LogWarning(exception, "Username update conflicted for account {UserId}.", user.Id);
            throw new ConflictException("Username is already taken.");
        }
    }

    public async Task DeleteCurrentUserEntityAsync(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserEntityAsync(cancellationToken);
        var auth0UserId = user.Auth0UserId;

        await auth0ManagementService.DeleteUserAsync(auth0UserId, cancellationToken);

        var deletedListCount = await unitOfWork.Lists.DeleteOwnedListEntitiesAsync(user.Id, cancellationToken);

        unitOfWork.Users.DeleteUserEntity(user);

        await unitOfWork.SaveAsync(cancellationToken);

        logger.LogInformation(
            "Deleted account {UserId} and {DeletedListCount} owned lists.",
            user.Id,
            deletedListCount);
    }
}
