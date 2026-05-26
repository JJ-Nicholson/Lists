using Microsoft.EntityFrameworkCore;

using Lists.Api.Dtos;
using Lists.Api.Errors;
using Lists.Api.Models;
using Lists.Api.Repositories;
using Lists.Api.Services.Users;

namespace Lists.Api.Services.ListItems;

public interface IListItemsService
{
    Task<ListItemEntity> CreateListItemEntityAsync(
        int listId,
        string itemName,
        decimal itemPrice,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<ListItemEntity>> UpdateItemEntitiesCompletionAsync(
        int listId,
        bool isCompleted,
        IReadOnlyList<BulkUpdateItemDto> items,
        CancellationToken cancellationToken);

    Task<ListItemEntity> UpdateListItemEntityAsync(
        int listId,
        int itemId,
        string name,
        decimal price,
        bool isCompleted,
        uint version,
        CancellationToken cancellationToken);

    Task DeleteListItemEntityAsync(int listId, int itemId, uint version, CancellationToken cancellationToken);
}

public class ListItemsService(
    IUnitOfWork unitOfWork,
    IUsersService userService
) : IListItemsService
{
    public async Task<ListItemEntity> CreateListItemEntityAsync(
        int listId,
        string itemName,
        decimal itemPrice,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.Lists.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var newItem = new ListItemEntity
        {
            ListId = listId,
            Name = itemName,
            Price = itemPrice,
            IsCompleted = false
        };

        newItem = unitOfWork.ListItems.CreateListItemEntity(newItem);

        await unitOfWork.SaveAsync(cancellationToken);

        return newItem;
    }

    public async Task<IReadOnlyList<ListItemEntity>> UpdateItemEntitiesCompletionAsync(
        int listId,
        bool isCompleted,
        IReadOnlyList<BulkUpdateItemDto> items,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.Lists.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var requestedItemIds = items
            .Select(i => i.Id)
            .ToList();

        if (requestedItemIds.Count != requestedItemIds.Distinct().Count())
        {
            throw new BadRequestException("Duplicate item ids are not allowed.");
        }

        var itemEntities = await unitOfWork.ListItems.GetListItemEntitiesAsync(
            listId,
            requestedItemIds,
            cancellationToken);

        if (itemEntities.Count != requestedItemIds.Count)
        {
            throw new NotFoundException("One or more items not found.");
        }

        var hasItemsAlreadyInTargetState = itemEntities.Any(i => i.IsCompleted == isCompleted);

        if (hasItemsAlreadyInTargetState)
        {
            throw new ConflictException(isCompleted
                ? "One or more items are already complete. Reload and try again."
                : "One or more items are already incomplete. Reload and try again."
            );
        }

        var requestedItemVersions = items.ToDictionary(
            i => i.Id,
            i => i.Version!.Value
       );

        foreach (var item in itemEntities)
        {
            unitOfWork.ListItems.SetListItemEntityOriginalVersion(item, requestedItemVersions[item.Id]);
            item.IsCompleted = isCompleted;
        }

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
            var updatedItemsById = itemEntities.ToDictionary(i => i.Id);

            return requestedItemIds
                .Select(id => updatedItemsById[id])
                .ToList();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("One or more items were modified. Reload and try again.");
        }
    }

    public async Task<ListItemEntity> UpdateListItemEntityAsync(
        int listId,
        int itemId,
        string name,
        decimal price,
        bool isCompleted,
        uint version,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.Lists.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var item = await unitOfWork.ListItems.GetListItemEntityAsync(listId, itemId, cancellationToken);

        if (item is null)
        {
            throw new NotFoundException("Item not found.");
        }

        unitOfWork.ListItems.SetListItemEntityOriginalVersion(item, version);
        item.Name = name;
        item.Price = price;
        item.IsCompleted = isCompleted;

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
            return item;
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Item was modified. Reload and try again.");
        }
    }

    public async Task DeleteListItemEntityAsync(
        int listId,
        int itemId,
        uint version,
        CancellationToken cancellationToken)
    {
        var currentUser = await userService.GetCurrentUserEntityAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(currentUser.Username))
        {
            throw new ConflictException("Choose a username before using lists.");
        }

        var hasListAccess = await unitOfWork.Lists.HasListAccessAsync(
            listId,
            currentUser.Id,
            cancellationToken);

        if (!hasListAccess)
        {
            throw new NotFoundException("List not found.");
        }

        var item = await unitOfWork.ListItems.GetListItemEntityAsync(listId, itemId, cancellationToken);

        if (item is null)
        {
            return;
        }

        unitOfWork.ListItems.SetListItemEntityOriginalVersion(item, version);

        unitOfWork.ListItems.DeleteListItemEntity(item);

        try
        {
            await unitOfWork.SaveAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("Item was modified. Reload and try again.");
        }
    }
}
