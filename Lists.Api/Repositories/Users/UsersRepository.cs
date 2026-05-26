using Microsoft.EntityFrameworkCore;

using Lists.Api.Data;
using Lists.Api.Models;

namespace Lists.Api.Repositories.Users;

public interface IUsersRepository
{
    Task<UserEntity?> GetUserEntityByAuth0Id(string auth0Id, CancellationToken cancellationToken);
    Task<UserEntity?> GetUserEntityByUsername(string username, CancellationToken cancellationToken);
    UserEntity CreateUserEntity(UserEntity user);
    void DeleteUserEntity(UserEntity user);
}

public class UsersRepository(ListsContext dbContext) : IUsersRepository
{
    public Task<UserEntity?> GetUserEntityByAuth0Id(string auth0Id, CancellationToken cancellationToken)
    {
        return dbContext.Users.SingleOrDefaultAsync(u => u.Auth0UserId == auth0Id, cancellationToken);
    }

    public Task<UserEntity?> GetUserEntityByUsername(string username, CancellationToken cancellationToken)
    {
        return dbContext.Users.SingleOrDefaultAsync(u => u.Username == username, cancellationToken);
    }

    public UserEntity CreateUserEntity(UserEntity user)
    {
        dbContext.Users.Add(user);
        return user;
    }

    public void DeleteUserEntity(UserEntity user)
    {
        dbContext.Users.Remove(user);
    }
}
