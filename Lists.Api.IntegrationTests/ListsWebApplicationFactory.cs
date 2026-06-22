using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

using Testcontainers.PostgreSql;

using Lists.Api.Data;
using Lists.Api.Services.Auth;

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
                ["Auth0:ManagementAudience"] = "https://test.auth0.local/api/v2/",
                ["Auth0:ManagementClientId"] = "test-client-id",
                ["Auth0:ManagementClientSecret"] = "test-client-secret",
                ["Cors:AllowedOrigins:0"] = "http://localhost"
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<ListsContext>>();
            services.RemoveAll<IAuth0ManagementService>();

            services.AddSingleton<TestSaveChangesInterceptor>();
            services.AddDbContext<ListsContext>((serviceProvider, options) =>
            {
                options.UseNpgsql(_postgresqlContainer.GetConnectionString());
                options.AddInterceptors(
                    serviceProvider.GetRequiredService<TestSaveChangesInterceptor>());
            });

            services.AddSingleton<TestAuth0ManagementService>();
            services.AddSingleton<IAuth0ManagementService>(serviceProvider =>
                serviceProvider.GetRequiredService<TestAuth0ManagementService>());

            services.AddSingleton<TestLoggerProvider>();
            services.AddSingleton<ILoggerProvider>(serviceProvider =>
                serviceProvider.GetRequiredService<TestLoggerProvider>());

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
        var auth0ManagementService = scope.ServiceProvider.GetRequiredService<TestAuth0ManagementService>();
        var saveChangesInterceptor = scope.ServiceProvider.GetRequiredService<TestSaveChangesInterceptor>();
        var loggerProvider = scope.ServiceProvider.GetRequiredService<TestLoggerProvider>();

        auth0ManagementService.Reset();
        saveChangesInterceptor.Reset();
        loggerProvider.Clear();

        await dbContext.ListAccesses.ExecuteDeleteAsync();
        await dbContext.ListItems.ExecuteDeleteAsync();
        await dbContext.Lists.ExecuteDeleteAsync();
        await dbContext.Users.ExecuteDeleteAsync();
    }

    public IReadOnlyList<string> GetDeletedAuth0UserIds()
    {
        using var scope = Services.CreateScope();

        var auth0ManagementService = scope.ServiceProvider.GetRequiredService<TestAuth0ManagementService>();

        return auth0ManagementService.DeletedUserIds.ToList();
    }

    public void FailNextSave()
    {
        Services.GetRequiredService<TestSaveChangesInterceptor>().FailNextSave();
    }

    public IReadOnlyList<TestLogEntry> GetLogEntries()
    {
        return Services.GetRequiredService<TestLoggerProvider>().Entries;
    }
}
