namespace Lists.Api.Endpoints.Health;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        var healthGroup = app.MapGroup("/health").AllowAnonymous();

        // GET /health (basic liveness check for deployment and uptime monitoring)
        healthGroup.MapGet("/", () =>
        {
            return Results.Ok(new HealthResponse("Healthy", DateTimeOffset.UtcNow));
        });
    }

    private sealed record HealthResponse(string Status, DateTimeOffset CheckedAt);
}
