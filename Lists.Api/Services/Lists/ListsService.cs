using Microsoft.EntityFrameworkCore;

using Lists.Api.Errors;
using Lists.Api.Models;
using Lists.Api.Repositories;
using Lists.Api.Repositories.Lists.Projections;
using Lists.Api.Services.Users;

namespace Lists.Api.Services.Lists;

public interface IListsService
{
    Task<ListSummariesPageProjection> GetListSummariesPageAsync(
        string? search,
        string? sortDirection,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken);

    Task<ListDetailsPageProjection> GetListPageByIdAsync(
        int listId,
        string? search,
        string? status,
        string? sortBy,
        string? sortDirection,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken);

    Task<ListEntity> CreateListEntityAsync(string listName, CancellationToken cancellationToken);

    Task<ListEntity> UpdateListEntityNameAsync(
        int listId,
        uint version,
        string newName,
        CancellationToken cancellationToken);

    Task DeleteListEntityAsync(int listId, uint version, CancellationToken cancellationToken);
}

public class ListsService(
    IUnitOfWork unitOfWork,
    IUsersService userService
) : IListsService
{
    public async Task<ListSummariesPageProjection> GetListSummariesPageAsync(
        string? search,
        string? sortDirection,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var directionValue = sortDirection?.Trim().ToLowerInvariant();

        if (directionValue is not null and not "" and not "asc" and not "desc")
        {
            throw new BadRequestException("Invalid list sort direction.");
        }

        var descending = directionValue == "desc";

        return await unitOfWork.Lists.GetListSummariesPageAsync(
            currentUser.Id,
            search,
            descending,
            pageValue,
            pageSizeValue,
            cancellationToken);
    }

    public async Task<ListDetailsPageProjection> GetListPageByIdAsync(
        int listId,
        string? search,
        string? status,
        string? sortBy,
        string? sortDirection,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var statusValue = status?.Trim().ToLowerInvariant();
        var sortValue = sortBy?.Trim().ToLowerInvariant();
        var directionValue = sortDirection?.Trim().ToLowerInvariant();

        if (statusValue is not null and not "" and not "all" and not "active" and not "completed")
        {
            throw new BadRequestException("Invalid item status.");
        }

        if (sortValue is not null and not "" and not "name" and not "price" and not "status")
        {
            throw new BadRequestException("Invalid item sort.");
        }

        if (directionValue is not null and not "" and not "asc" and not "desc")
        {
            throw new BadRequestException("Invalid item sort direction.");
        }

        var hasListAccess = await unitOfWork.ListAccessEntries.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var result = await unitOfWork.Lists.GetListPageByIdAsync(
            listId,
            search,
            statusValue,
            sortValue,
            directionValue == "desc",
            pageValue,
            pageSizeValue,
            cancellationToken);

        if (result is null)
        {
            throw new NotFoundException("List not found.");
        }

        return result;
    }

    public async Task<ListEntity> CreateListEntityAsync(string listName, CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var list = new ListEntity
        {
            Name = listName.Trim(),
            AccessEntries =
            [
                new ListAccessEntryEntity
                {
                    UserId = currentUser.Id,
                    Role = ListAccessRole.Owner
                }
            ]
        };

        list = unitOfWork.Lists.CreateListEntity(list);

        await unitOfWork.SaveAsync(cancellationToken);

        return list;
    }

    public async Task<ListEntity> UpdateListEntityNameAsync(
        int listId,
        uint version,
        string newName,
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

        var list = await unitOfWork.Lists.GetListEntityForUpdateAsync(listId, version, cancellationToken);

        if (list is null)
        {
            throw new NotFoundException("List not found.");
        }

        list.Name = newName.Trim();

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
            return list;
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("List was modified. Reload and try again.");
        }
    }

    public async Task DeleteListEntityAsync(int listId, uint version, CancellationToken cancellationToken)
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

        var isOwner = await unitOfWork.ListAccessEntries.IsListOwnerAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!isOwner)
        {
            throw new ForbiddenException("Only list owners can delete lists.");
        }

        var list = await unitOfWork.Lists.GetListEntityForDeleteAsync(listId, version, cancellationToken);

        if (list is null)
        {
            return;
        }

        unitOfWork.Lists.DeleteListEntity(list);

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("List was modified. Reload and try again.");
        }
    }
}
