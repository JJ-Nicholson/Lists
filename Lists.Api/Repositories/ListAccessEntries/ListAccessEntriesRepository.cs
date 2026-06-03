using Microsoft.EntityFrameworkCore;

using Lists.Api.Data;
using Lists.Api.Models;
using Lists.Api.Repositories.ListAccessEntries.Projections;

namespace Lists.Api.Repositories.ListAccessEntries;

public interface IListAccessEntriesRepository
{
    Task<bool> HasListAccessAsync(int listId, int userId, CancellationToken cancellationToken);
    Task<bool> IsListOwnerAsync(int listId, int userId, CancellationToken cancellationToken);
    void CreateListAccessEntryEntity(int listId, int userId);
    Task<IReadOnlyList<ListAccessEntryProjection>> GetListAccessEntriesAsync(
        int listId,
        CancellationToken cancellationToken);
    Task<ListAccessEntryEntity?> GetListAccessEntryEntityAsync(
        int listId,
        int userId,
        CancellationToken cancellationToken);
    void DeleteListAccessEntryEntity(ListAccessEntryEntity listAccessEntry);
}

public class ListAccessEntriesRepository(ListsContext dbContext) : IListAccessEntriesRepository
{
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

    public void CreateListAccessEntryEntity(int listId, int userId)
    {
        var listAccessEntry = new ListAccessEntryEntity
        {
            ListId = listId,
            UserId = userId,
            Role = ListAccessRole.Editor
        };

        dbContext.ListAccesses.Add(listAccessEntry);
    }

    public async Task<IReadOnlyList<ListAccessEntryProjection>> GetListAccessEntriesAsync(
        int listId,
        CancellationToken cancellationToken)
    {
        return await dbContext.ListAccesses
            .AsNoTracking()
            .Where(a => a.ListId == listId)
            .Join(
                dbContext.Users,
                a => a.UserId,
                u => u.Id,
                (a, u) => new ListAccessEntryProjection(
                    u.Username!,
                    a.Role
                ))
            .ToListAsync(cancellationToken);
    }

    public Task<ListAccessEntryEntity?> GetListAccessEntryEntityAsync(
        int listId,
        int userId,
        CancellationToken cancellationToken)
    {
        return dbContext.ListAccesses.FirstOrDefaultAsync(a =>
            a.ListId == listId &&
            a.UserId == userId,
            cancellationToken);
    }

    public void DeleteListAccessEntryEntity(ListAccessEntryEntity listAccessEntry)
    {
        dbContext.ListAccesses.Remove(listAccessEntry);
    }
}
