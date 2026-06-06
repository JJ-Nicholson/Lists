using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;

using Lists.Api.Errors;

namespace Lists.Api.Services.Auth;

public interface IAuth0ManagementService
{
    Task DeleteUserAsync(string auth0UserId, CancellationToken cancellationToken);
}

public record Auth0ManagementConfig(
    Uri BaseUri,
    string Audience,
    string ClientId,
    string ClientSecret);

public class Auth0ManagementService(
    HttpClient httpClient,
    Auth0ManagementConfig config,
    ILogger<Auth0ManagementService> logger
) : IAuth0ManagementService
{
    public async Task DeleteUserAsync(string auth0UserId, CancellationToken cancellationToken)
    {
        var accessToken = await GetAccessTokenAsync(cancellationToken);
        var encodedUserId = Uri.EscapeDataString(auth0UserId);

        using var request = new HttpRequestMessage(
            HttpMethod.Delete,
            new Uri(config.BaseUri, $"api/v2/users/{encodedUserId}"));

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            logger.LogInformation("Auth0 user {Auth0UserId} was already deleted.", auth0UserId);
            return;
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError(
                "Failed to delete Auth0 user {Auth0UserId}. Status code {StatusCode}.",
                auth0UserId,
                response.StatusCode);

            throw new ExternalServiceException("Account deletion could not be completed right now.");
        }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = config.ClientId,
            ["client_secret"] = config.ClientSecret,
            ["audience"] = config.Audience
        });

        using var response = await httpClient.PostAsync(
            new Uri(config.BaseUri, "oauth/token"),
            content,
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Failed to get Auth0 Management API token. Status code {StatusCode}.", response.StatusCode);
            throw new ExternalServiceException("Account deletion could not be completed right now.");
        }

        var token = await response.Content.ReadFromJsonAsync<ManagementTokenResponse>(cancellationToken);

        if (string.IsNullOrWhiteSpace(token?.AccessToken))
        {
            throw new ExternalServiceException("Account deletion could not be completed right now.");
        }

        return token.AccessToken;
    }

    private class ManagementTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; init; }
    }
}
