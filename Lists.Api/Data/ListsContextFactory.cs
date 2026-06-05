using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Lists.Api.Data;

public class ListsContextFactory : IDesignTimeDbContextFactory<ListsContext>
{
    public ListsContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddUserSecrets<ListsContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Lists")
            ?? throw new InvalidOperationException("ConnectionStrings:Lists must be configured.");

        var optionsBuilder = new DbContextOptionsBuilder<ListsContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new ListsContext(optionsBuilder.Options);
    }
}
