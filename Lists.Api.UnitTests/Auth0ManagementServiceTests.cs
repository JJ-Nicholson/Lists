using System.Net;
using System.Net.Http.Headers;
using System.Text;

using Microsoft.Extensions.Logging.Abstractions;

using Lists.Api.Services.Auth;

namespace Lists.Api.UnitTests;

public class Auth0ManagementServiceTests
{
    // Verifies Auth0 account deletion requests a Management API token and deletes the encoded user ID.
    [Fact]
    public async Task DeleteUserAsync_WhenAuth0RequestsSucceed_DeletesEncodedAuth0User()
    {
        // Arrange
        var handler = new RecordingHttpMessageHandler(request =>
        {
            if (request.Method == HttpMethod.Post && request.RequestUri?.AbsolutePath == "/oauth/token")
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        "{\"access_token\":\"management-token\"}",
                        Encoding.UTF8,
                        "application/json")
                };
            }

            if (request.Method == HttpMethod.Delete &&
                request.RequestUri?.AbsolutePath == "/api/v2/users/auth0%7Ctest-user")
            {
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }

            return new HttpResponseMessage(HttpStatusCode.BadRequest);
        });

        var service = new Auth0ManagementService(
            new HttpClient(handler),
            new Auth0ManagementConfig(
                new Uri("https://test.auth0.local/"),
                "https://test.auth0.local/api/v2/",
                "test-client-id",
                "test-client-secret"),
            NullLogger<Auth0ManagementService>.Instance);

        // Act
        await service.DeleteUserAsync("auth0|test-user", CancellationToken.None);

        // Assert
        Assert.Equal(2, handler.Requests.Count);

        var tokenRequest = handler.Requests[0];
        Assert.Equal(HttpMethod.Post, tokenRequest.Method);
        Assert.Equal("https://test.auth0.local/oauth/token", tokenRequest.RequestUri?.ToString());
        Assert.Contains("grant_type=client_credentials", tokenRequest.Body);
        Assert.Contains("client_id=test-client-id", tokenRequest.Body);
        Assert.Contains("client_secret=test-client-secret", tokenRequest.Body);
        Assert.Contains("audience=https%3A%2F%2Ftest.auth0.local%2Fapi%2Fv2%2F", tokenRequest.Body);

        var deleteRequest = handler.Requests[1];
        Assert.Equal(HttpMethod.Delete, deleteRequest.Method);
        Assert.Equal("https://test.auth0.local", deleteRequest.RequestUri?.GetLeftPart(UriPartial.Authority));
        Assert.Equal("/api/v2/users/auth0%7Ctest-user", deleteRequest.RequestUri?.AbsolutePath);
        Assert.Equal("Bearer", deleteRequest.Authorization?.Scheme);
        Assert.Equal("management-token", deleteRequest.Authorization?.Parameter);
    }

    private class RecordingHttpMessageHandler(Func<RecordedRequest, HttpResponseMessage> getResponse)
        : HttpMessageHandler
    {
        public List<RecordedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var body = request.Content is null
                ? string.Empty
                : await request.Content.ReadAsStringAsync(cancellationToken);

            var recordedRequest = new RecordedRequest(
                request.Method,
                request.RequestUri,
                request.Headers.Authorization,
                body);

            Requests.Add(recordedRequest);

            return getResponse(recordedRequest);
        }
    }

    private record RecordedRequest(
        HttpMethod Method,
        Uri? RequestUri,
        AuthenticationHeaderValue? Authorization,
        string Body);
}
