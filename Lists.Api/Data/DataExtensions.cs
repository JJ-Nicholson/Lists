using Microsoft.EntityFrameworkCore;

namespace Lists.Api.Data;

public static class DataExtensions
{
    public static void AddListsDb(this WebApplicationBuilder builder)
    {
        var connString = builder.Configuration.GetConnectionString("Lists");
        builder.Services.AddDbContext<ListsContext>(options =>
        {
            options.UseNpgsql(connString);
        });
    }

    public static void MigrateDb(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();
        dbContext.Database.Migrate();
    }
}
