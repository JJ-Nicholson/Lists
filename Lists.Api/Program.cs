using Microsoft.AspNetCore.Authentication.JwtBearer;

using Lists.Api.Data;
using Lists.Api.Errors;
using Lists.Api.Services.Auth;

using Lists.Api.Endpoints.Users;
using Lists.Api.Endpoints.Lists;
using Lists.Api.Endpoints.ListItems;
using Lists.Api.Endpoints.ListAccessEntries;
using Lists.Api.Endpoints.Health;

using Lists.Api.Services.Users;
using Lists.Api.Services.Lists;
using Lists.Api.Services.ListItems;
using Lists.Api.Services.ListAccessEntries;

using Lists.Api.Repositories;
using Lists.Api.Repositories.Users;
using Lists.Api.Repositories.Lists;
using Lists.Api.Repositories.ListItems;
using Lists.Api.Repositories.ListAccessEntries;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddHttpContextAccessor();
builder.Services.AddValidation();

builder.AddListsDb();

builder.Services.AddScoped<IUserContext, Auth0UserContext>();

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.AddScoped<IUsersRepository, UsersRepository>();
builder.Services.AddScoped<IUsersService, UsersService>();

builder.Services.AddScoped<IListsRepository, ListsRepository>();
builder.Services.AddScoped<IListsService, ListsService>();

builder.Services.AddScoped<IListItemsRepository, ListItemsRepository>();
builder.Services.AddScoped<IListItemsService, ListItemsService>();

builder.Services.AddScoped<IListAccessEntriesRepository, ListAccessEntriesRepository>();
builder.Services.AddScoped<IListAccessEntriesService, ListAccessEntriesService>();

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

app.UseExceptionHandler();

app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();
app.MapUsersEndpoints();
app.MapListsEndpoints();
app.MapListItemsEndpoints();
app.MapListAccessEntriesEndpoints();

app.Run();
