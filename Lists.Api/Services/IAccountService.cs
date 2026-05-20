using Lists.Api.Models;

namespace Lists.Api.Services;

public interface IAccountService
{
    Task<UserEntity> GetOrCreateCurrentUserAsync(CancellationToken cancellationToken = default);
}
