using Microsoft.EntityFrameworkCore;

using Lists.Api.Data;
using Lists.Api.Models;

namespace Lists.Api.Repositories.ListItems;

public interface IListItemsRepository
{
    void CreateListItemEntity(ListItemEntity listItem);

    Task<IReadOnlyList<ListItemEntity>> GetListItemEntitiesAsync(
        int listId,
        IReadOnlyList<int> itemIds,
        CancellationToken cancellationToken);

    void SetListItemEntityOriginalVersion(ListItemEntity listItem, uint version);
    Task<ListItemEntity?> GetListItemEntityAsync(int listId, int itemId, CancellationToken cancellationToken);
    void DeleteListItemEntity(ListItemEntity listItem);
}

public class ListItemsRepository(ListsContext dbContext) : IListItemsRepository
{
    public void CreateListItemEntity(ListItemEntity listItem)
    {
        dbContext.ListItems.Add(listItem);
    }

    public async Task<IReadOnlyList<ListItemEntity>> GetListItemEntitiesAsync(
        int listId,
        IReadOnlyList<int> itemIds,
        CancellationToken cancellationToken)
    {
        return await dbContext.ListItems
            .Where(i =>
                i.ListId == listId &&
                itemIds.Contains(i.Id))
            .ToListAsync(cancellationToken);
    }

    public void SetListItemEntityOriginalVersion(ListItemEntity listItem, uint version)
    {
        dbContext.Entry(listItem)
            .Property(l => l.Version)
            .OriginalValue = version;
    }

    public async Task<ListItemEntity?> GetListItemEntityAsync(
        int listId,
        int itemId,
        CancellationToken cancellationToken)
    {
        return await dbContext.ListItems
            .Where(i =>
                i.ListId == listId &&
                i.Id == itemId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public void DeleteListItemEntity(ListItemEntity listItem)
    {
        dbContext.ListItems.Remove(listItem);
    }
}
