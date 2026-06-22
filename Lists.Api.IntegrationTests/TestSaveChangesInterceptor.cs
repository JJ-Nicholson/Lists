using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Lists.Api.IntegrationTests;

public class TestSaveChangesInterceptor : SaveChangesInterceptor
{
    private bool failNextSave;

    public void FailNextSave()
    {
        failNextSave = true;
    }

    public void Reset()
    {
        failNextSave = false;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (failNextSave)
        {
            failNextSave = false;
            throw new InvalidOperationException("Test database failure.");
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
