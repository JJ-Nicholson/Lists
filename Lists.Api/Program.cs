using Microsoft.AspNetCore.Authentication.JwtBearer;
using Lists.Api.Data;
using Lists.Api.Endpoints;
using Lists.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddValidation();
builder.AddListsDb();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUserContext, Auth0UserContext>();
builder.Services.AddScoped<IAccountService, AccountService>();

var auth0Domain = builder.Configuration["Auth0:Domain"];
var auth0Audience = builder.Configuration["Auth0:Audience"];

if (string.IsNullOrWhiteSpace(auth0Domain))
{
    throw new InvalidOperationException("Auth0:Domain must be configured.");
}

if (string.IsNullOrWhiteSpace(auth0Audience))
{
    throw new InvalidOperationException("Auth0:Audience must be configured.");
}

var auth0Authority = auth0Domain.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
    ? auth0Domain
    : $"https://{auth0Domain}";

if (!auth0Authority.EndsWith('/'))
{
    auth0Authority += "/";
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = auth0Authority;
        options.Audience = auth0Audience;
    });

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins must be configured.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapAccountEndpoints();

app.Run();
