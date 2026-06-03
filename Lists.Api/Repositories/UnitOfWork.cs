using Lists.Api.Data;
using Lists.Api.Repositories.Users;
using Lists.Api.Repositories.Lists;
using Lists.Api.Repositories.ListItems;
using Lists.Api.Repositories.ListAccessEntries;

namespace Lists.Api.Repositories;

public interface IUnitOfWork
{
    IUsersRepository Users { get; }
    IListsRepository Lists { get; }
    IListItemsRepository ListItems { get; }
    IListAccessEntriesRepository ListAccessEntries { get; }
    Task SaveAsync(CancellationToken cancellationToken);
}

public class UnitOfWork(
    IUsersRepository usersRepository,
    IListsRepository listsRepository,
    IListItemsRepository listItemsRepository,
    IListAccessEntriesRepository listAccessEntriesRepository,
    ListsContext dbContext) : IUnitOfWork
{
    public IUsersRepository Users => usersRepository;
    public IListsRepository Lists => listsRepository;
    public IListItemsRepository ListItems => listItemsRepository;
    public IListAccessEntriesRepository ListAccessEntries => listAccessEntriesRepository;

    public async Task SaveAsync(CancellationToken cancellationToken)
    {
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
