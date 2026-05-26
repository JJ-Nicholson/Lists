using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

using Testcontainers.PostgreSql;

using Lists.Api.Data;

namespace Lists.Api.IntegrationTests;

public class ListsWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresqlContainer =
        new PostgreSqlBuilder("postgres:18-alpine")
            .WithDatabase("lists_test")
            .WithUsername("postgres")
            .WithPassword("postgres")
            .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Auth0:Domain"] = "test.auth0.local",
                ["Auth0:Audience"] = "test-api",
                ["Cors:AllowedOrigins:0"] = "http://localhost"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<ListsContext>>();

            services.AddDbContext<ListsContext>(options =>
            {
                options.UseNpgsql(_postgresqlContainer.GetConnectionString());
            });

            services
                .AddAuthentication(IntegrationTestAuthHandler.AuthenticationScheme)
                .AddScheme<AuthenticationSchemeOptions, IntegrationTestAuthHandler>(
                    IntegrationTestAuthHandler.AuthenticationScheme,
                    _ => { });
        });
    }

    public async Task InitializeAsync()
    {
        await _postgresqlContainer.StartAsync();
        await ApplyMigrationsAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _postgresqlContainer.DisposeAsync();
    }

    private async Task ApplyMigrationsAsync()
    {
        using var scope = Services.CreateScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        await dbContext.Database.MigrateAsync();
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();

        var dbContext = scope.ServiceProvider.GetRequiredService<ListsContext>();

        await dbContext.ListAccesses.ExecuteDeleteAsync();
        await dbContext.ListItems.ExecuteDeleteAsync();
        await dbContext.Lists.ExecuteDeleteAsync();
        await dbContext.Users.ExecuteDeleteAsync();
    }
}
