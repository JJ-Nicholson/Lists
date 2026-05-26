using Microsoft.EntityFrameworkCore;

using Lists.Api.Data;
using Lists.Api.Models;
using Lists.Api.Repositories.Lists.Projections;

namespace Lists.Api.Repositories.Lists;

public interface IListsRepository
{
    Task<bool> HasListAccessAsync(int listId, int userId, CancellationToken cancellationToken);
    Task<bool> IsListOwnerAsync(int listId, int userId, CancellationToken cancellationToken);

    Task<ListSummariesPageProjection> GetListSummariesPageAsync(
        int currentUserId,
        string? search,
        bool descending,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken);

    Task<ListDetailsPageProjection?> GetListPageByIdAsync(
        int listId,
        string? search,
        string? status,
        string? sortBy,
        bool descending,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken);

    ListEntity CreateListEntity(ListEntity list);

    Task<ListEntity?> GetListEntityForUpdateAsync(
        int listId,
        uint version,
        CancellationToken cancellationToken);

    Task<ListEntity?> GetListEntityForDeleteAsync(
        int listId,
        uint version,
        CancellationToken cancellationToken);

    void DeleteListEntity(ListEntity list);
    Task<int> DeleteOwnedListEntitiesAsync(int ownerUserId, CancellationToken cancellationToken);
}

public class ListsRepository(ListsContext dbContext) : IListsRepository
{
    private const string LikeEscapeCharacter = "\\";

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");
    }

    public Task<bool> HasListAccessAsync(int listId, int userId, CancellationToken cancellationToken)
    {
        return dbContext.ListAccesses.AnyAsync(a =>
            a.ListId == listId &&
            a.UserId == userId,
            cancellationToken);
    }

    public Task<bool> IsListOwnerAsync(int listId, int userId, CancellationToken cancellationToken)
    {
        return dbContext.ListAccesses.AnyAsync(a =>
            a.ListId == listId &&
            a.UserId == userId &&
            a.Role == ListAccessRole.Owner,
            cancellationToken);
    }

    public async Task<ListSummariesPageProjection> GetListSummariesPageAsync(
        int currentUserId,
        string? search,
        bool descending,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken)
    {
        var listsQuery =
            from list in dbContext.Lists
            join currentAccess in dbContext.ListAccesses.Where(a => a.UserId == currentUserId)
                on list.Id equals currentAccess.ListId
            join ownerAccess in dbContext.ListAccesses.Where(a => a.Role == ListAccessRole.Owner)
                on list.Id equals ownerAccess.ListId
            join owner in dbContext.Users
                on ownerAccess.UserId equals owner.Id
            select new
            {
                List = list,
                CurrentUserRole = currentAccess.Role,
                OwnerUsername = owner.Username
            };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{EscapeLikePattern(search.Trim())}%";

            listsQuery = listsQuery.Where(l =>
                EF.Functions.ILike(l.List.Name, searchPattern, LikeEscapeCharacter));
        }

        listsQuery = descending
            ? listsQuery.OrderByDescending(l => l.List.Name).ThenBy(l => l.List.Id)
            : listsQuery.OrderBy(l => l.List.Name).ThenBy(l => l.List.Id);

        var totalCount = await listsQuery.CountAsync(cancellationToken);
        var pageInfo = GetPageInfo(pageValue, pageSizeValue, totalCount);

        var summaries = await listsQuery
            .AsNoTracking()
            .Skip((pageInfo.Page - 1) * pageInfo.PageSize)
            .Take(pageInfo.PageSize)
            .Select(l => new ListSummaryProjection(
                l.List.Id,
                l.List.Name,
                l.List.Version,
                l.List.Items.Count,
                l.List.Items.Count(i => i.IsCompleted),
                l.CurrentUserRole,
                l.OwnerUsername
            ))
            .ToListAsync(cancellationToken);

        return new ListSummariesPageProjection(
            summaries,
            pageInfo
        );
    }

    public async Task<ListDetailsPageProjection?> GetListPageByIdAsync(
        int listId,
        string? search,
        string? status,
        string? sortBy,
        bool descending,
        int pageValue,
        int pageSizeValue,
        CancellationToken cancellationToken)
    {
        var list = await dbContext.Lists
            .AsNoTracking()
            .Where(l => l.Id == listId)
            .Select(l => new
            {
                l.Id,
                l.Name,
                l.Version
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (list is null)
        {
            return null;
        }

        var itemsQuery = dbContext.ListItems
            .AsNoTracking()
            .Where(i => i.ListId == listId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{EscapeLikePattern(search.Trim())}%";

            itemsQuery = itemsQuery.Where(i =>
                EF.Functions.ILike(i.Name, searchPattern, LikeEscapeCharacter));
        }

        itemsQuery = status switch
        {
            null or "" or "all" => itemsQuery,
            "active" => itemsQuery.Where(i => !i.IsCompleted),
            "completed" => itemsQuery.Where(i => i.IsCompleted),
            _ => throw new ArgumentException("Invalid item status.", nameof(status))
        };

        itemsQuery = sortBy switch
        {
            null or "" or "name" => descending
                ? itemsQuery.OrderByDescending(i => i.Name).ThenBy(i => i.Id)
                : itemsQuery.OrderBy(i => i.Name).ThenBy(i => i.Id),

            "price" => descending
                ? itemsQuery.OrderByDescending(i => i.Price).ThenBy(i => i.Id)
                : itemsQuery.OrderBy(i => i.Price).ThenBy(i => i.Id),

            "status" => descending
                ? itemsQuery.OrderByDescending(i => i.IsCompleted).ThenBy(i => i.Id)
                : itemsQuery.OrderBy(i => i.IsCompleted).ThenBy(i => i.Id),

            _ => throw new ArgumentException("Invalid item sort.", nameof(sortBy))
        };

        var totalCount = await itemsQuery.CountAsync(cancellationToken);
        var pageInfo = GetPageInfo(pageValue, pageSizeValue, totalCount);
        var totalPrice = await itemsQuery.SumAsync(i => (decimal?)i.Price, cancellationToken) ?? 0;

        var items = await itemsQuery
            .Skip((pageInfo.Page - 1) * pageInfo.PageSize)
            .Take(pageInfo.PageSize)
            .Select(i => new ListItemProjection(
                i.Id,
                i.Name,
                i.Price,
                i.IsCompleted,
                i.Version
            ))
            .ToListAsync(cancellationToken);

        return new ListDetailsPageProjection(
            list.Id,
            list.Name,
            list.Version,
            items,
            pageInfo,
            totalPrice
        );
    }

    public ListEntity CreateListEntity(ListEntity list)
    {
        dbContext.Lists.Add(list);
        return list;
    }

    public async Task<ListEntity?> GetListEntityForUpdateAsync(
        int listId,
        uint version,
        CancellationToken cancellationToken)
    {
        var list = await dbContext.Lists
            .Include(l => l.Items)
            .SingleOrDefaultAsync(l => l.Id == listId, cancellationToken);

        if (list is null)
        {
            return null;
        }

        dbContext.Entry(list)
            .Property(l => l.Version)
            .OriginalValue = version;

        return list;
    }

    public async Task<ListEntity?> GetListEntityForDeleteAsync(
        int listId,
        uint version,
        CancellationToken cancellationToken)
    {
        var list = await dbContext.Lists
            .SingleOrDefaultAsync(l => l.Id == listId, cancellationToken);

        if (list is null)
        {
            return null;
        }

        dbContext.Entry(list)
            .Property(l => l.Version)
            .OriginalValue = version;

        return list;
    }

    public void DeleteListEntity(ListEntity list)
    {
        dbContext.Lists.Remove(list);
    }

    public async Task<int> DeleteOwnedListEntitiesAsync(int ownerUserId, CancellationToken cancellationToken)
    {
        var lists = await dbContext.Lists
            .Where(l => l.AccessEntries.Any(a =>
                a.UserId == ownerUserId &&
                a.Role == ListAccessRole.Owner))
            .ToListAsync(cancellationToken);

        dbContext.Lists.RemoveRange(lists);

        return lists.Count;
    }

    private static PageInfo GetPageInfo(int requestedPage, int pageSize, int totalCount)
    {
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
        var effectivePage = totalPages == 0
            ? 1
            : Math.Min(requestedPage, totalPages);

        return new PageInfo(effectivePage, pageSize, totalCount, totalPages);
    }
}
