using Microsoft.EntityFrameworkCore;

using Npgsql;

using Lists.Api.Dtos;
using Lists.Api.Errors;
using Lists.Api.Repositories;
using Lists.Api.Repositories.ListAccessEntries.Projections;
using Lists.Api.Services.Users;

namespace Lists.Api.Services.ListAccessEntries;

public interface IListAccessEntriesService
{
    Task GrantAccessAsync(int listId, GrantAccessDto dto, CancellationToken cancellationToken);

    Task<IReadOnlyList<ListAccessEntryProjection>> GetListAccessEntriesAsync(
        int listId,
        CancellationToken cancellationToken);

    Task RevokeAccessAsync(int listId, string targetUsername, CancellationToken cancellationToken);
}

public class ListAccessEntriesService(
    IUnitOfWork unitOfWork,
    IUsersService userService
) : IListAccessEntriesService
{
    public async Task GrantAccessAsync(
        int listId,
        GrantAccessDto dto,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.ListAccessEntries.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var isListOwner = await unitOfWork.ListAccessEntries.IsListOwnerAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!isListOwner)
        {
            throw new ForbiddenException("Only list owners can manage list access.");
        }

        var normalisedTargetUsername = dto.Username.Trim().ToLowerInvariant();
        var targetUser = await unitOfWork.Users.GetUserEntityByUsername(
            normalisedTargetUsername,
            cancellationToken);

        if (targetUser is null)
        {
            throw new NotFoundException($"User with username '{normalisedTargetUsername}' not found.");
        }

        var hasAccess = await unitOfWork.ListAccessEntries.HasListAccessAsync(
            listId,
            targetUser.Id,
            cancellationToken);

        if (hasAccess)
        {
            throw new ConflictException("User already has access.");
        }

        unitOfWork.ListAccessEntries.CreateListAccessEntryEntity(listId, targetUser.Id);

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
        }
        catch (DbUpdateException exception)
            when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ConflictException("User already has access.");
        }
    }

    public async Task<IReadOnlyList<ListAccessEntryProjection>> GetListAccessEntriesAsync(
        int listId,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.ListAccessEntries.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        return await unitOfWork.ListAccessEntries.GetListAccessEntriesAsync(
            listId,
            cancellationToken);
    }

    public async Task RevokeAccessAsync(
        int listId,
        string targetUsername,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.ListAccessEntries.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var isListOwner = await unitOfWork.ListAccessEntries.IsListOwnerAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!isListOwner)
        {
            throw new ForbiddenException("Only list owners can manage list access.");
        }

        var normalisedTargetUsername = targetUsername.Trim().ToLowerInvariant();
        var targetUser = await unitOfWork.Users.GetUserEntityByUsername(
            normalisedTargetUsername,
            cancellationToken);

        if (targetUser is null)
        {
            throw new NotFoundException($"User with username '{normalisedTargetUsername}' not found.");
        }

        if (targetUser.Id == currentUser.Id)
        {
            throw new ConflictException("Owner cannot remove themselves.");
        }

        var accessEntry = await unitOfWork.ListAccessEntries.GetListAccessEntryEntityAsync(
            listId,
            targetUser.Id,
            cancellationToken);

        if (accessEntry is null)
        {
            throw new NotFoundException(
                $"User with username '{normalisedTargetUsername}' does not have access to the list.");
        }

        unitOfWork.ListAccessEntries.DeleteListAccessEntryEntity(accessEntry);

        await unitOfWork.SaveAsync(cancellationToken);
    }
}
