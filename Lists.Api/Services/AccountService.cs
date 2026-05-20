using Microsoft.EntityFrameworkCore;
using Lists.Api.Data;
using Lists.Api.Models;

namespace Lists.Api.Services;

public class AccountService : IAccountService
{
    private readonly ListsContext dbContext;
    private readonly IUserContext userContext;

    public AccountService(ListsContext dbContext, IUserContext userContext)
    {
        this.dbContext = dbContext;
        this.userContext = userContext;
    }

    public async Task<UserEntity> GetOrCreateCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .SingleOrDefaultAsync(u => u.Auth0UserId == userContext.Auth0UserId, cancellationToken);

        if (user is not null)
        {
            return user;
        }

        user = new UserEntity
        {
            Auth0UserId = userContext.Auth0UserId,
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return user;
    }

}
