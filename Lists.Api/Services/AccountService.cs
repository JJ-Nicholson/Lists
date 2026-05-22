using Microsoft.EntityFrameworkCore;
using Lists.Api.Data;
using Lists.Api.Models;

namespace Lists.Api.Services;

public class AccountService : IAccountService
{
    private readonly ListsContext dbContext;
    private readonly IUserContext userContext;
    private readonly ILogger<AccountService> logger;

    public AccountService(
        ListsContext dbContext,
        IUserContext userContext,
        ILogger<AccountService> logger)
    {
        this.dbContext = dbContext;
        this.userContext = userContext;
        this.logger = logger;
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

        logger.LogInformation("Created account {UserId}.", user.Id);

        return user;
    }

}
