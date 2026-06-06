using Lists.Api.Services.Auth;

namespace Lists.Api.IntegrationTests;

public class TestAuth0ManagementService : IAuth0ManagementService
{
    public List<string> DeletedUserIds { get; } = [];

    public Task DeleteUserAsync(string auth0UserId, CancellationToken cancellationToken)
    {
        DeletedUserIds.Add(auth0UserId);
        return Task.CompletedTask;
    }

    public void Reset()
    {
        DeletedUserIds.Clear();
    }
}
