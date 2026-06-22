# Lists

[![CI](https://github.com/JJ-Nicholson/Lists/actions/workflows/ci.yml/badge.svg)](https://github.com/JJ-Nicholson/Lists/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-yellow.svg)](LICENSE)

Lists is a web application for creating, managing, and sharing lists, such as
shopping lists, reading lists, to-do lists, budgets, etc. Users can organise
entries, track amounts and completion, and collaborate through owner and editor
access roles.

[View the production website](https://lists-ebon.vercel.app/)

## Features

- Auth0 authentication and profile usernames
- Personal and shared lists
- Owner and editor permissions
- Optimistic concurrency protection for shared changes
- Thoughtful privacy policy and data management
- Search, filtering, sorting, and pagination
- Entry amounts, completion tracking, and list totals
- Responsive, installable web interface

## Permissions

| Capability | Owner | Editor |
| --- | --- | --- |
| View the list, entries, and access roles | Yes | Yes |
| Rename the list and change its unit label | Yes | Yes |
| Add, update, complete, and delete entries | Yes | Yes |
| Grant and revoke list access | Yes | No |
| Delete the list | Yes | No |

## Optimistic Concurrency

Lists uses version tokens to protect list and entry changes from stale writes.
Updates, deletions, and bulk actions are rejected when another user has changed
the same data first. The interface explains the conflict and offers a reload
flow so users can review the latest data before trying again.

## Technology

- React, TypeScript, CSS, and Vite
- C#, ASP.NET Core, and Entity Framework Core
- PostgreSQL
- Auth0
- Vercel and Render
- Vitest, Testing Library, and xUnit

## Production Infrastructure

The production frontend is hosted on Vercel. A rewrite serves `index.html` for
application routes so React Router can handle client-side navigation. Render
hosts the containerised ASP.NET Core API and managed PostgreSQL database. Auth0
provides authentication and authorisation.

The API Docker image includes the published application and an Entity Framework
migration bundle for applying database migrations during deployment.

## Project Structure

```text
Lists.Api/                  ASP.NET Core API
Lists.Api.UnitTests/        API unit tests
Lists.Api.IntegrationTests/ API integration tests
Lists.Web/                  React frontend
```

## Requirements

- .NET 10 SDK
- Node.js 24 and npm
- PostgreSQL
- Docker for the API integration tests
- An Auth0 application, API, and Management API client

## Local Setup

### Auth0

Authentication and account deletion use three Auth0 resources. Via the Auth0 website:

1. Create a **Lists API** in Auth0. Its identifier is the API **audience**. The
   frontend uses this audience when requesting access tokens, and the backend
   uses it when validating those tokens.

2. Create a **Single Page Application** for the React frontend. Configure the
   frontend origin as an allowed web origin and logout URL, and configure
   `/auth/callback` as an allowed callback URL. Then grant the SPA
   **user-delegated access** to the **Lists API** from the application’s
   **API Access** settings, so the frontend can request access tokens for that
   API.

3. Create a **Machine to Machine Application** for the backend. Authorise it to
   call the **Auth0 Management API** with the `delete:users` permission, so
   account deletion can also remove the user’s Auth0 identity.

The repository includes development defaults and example Auth0 configuration, but
it does not include the local secrets required to run the app. To run the app
locally, supply your own Auth0 tenant values and backend secrets using the steps
below.

For the backend, use .NET user secrets to provide the database connection string,
Auth0 domain, API audience, Management API audience, Management API client ID,
and Management API client secret. User secrets override the values in
`Lists.Api/appsettings.Development.json` during local development.

For the frontend, copy `Lists.Web/.env.example` to `Lists.Web/.env.local`.
Replace the example Auth0 values with the values from your Auth0 Single Page
Application and Lists API: use the SPA domain and client ID, and use the Lists
API identifier as the audience.

### Backend

Configure the database and Auth0 settings with .NET user secrets:

```bash
dotnet user-secrets set "ConnectionStrings:Lists" "Host=localhost;Port=5432;Database=lists;Username=postgres;Password=postgres" --project Lists.Api
dotnet user-secrets set "Auth0:Domain" "YOUR_AUTH0_DOMAIN" --project Lists.Api
dotnet user-secrets set "Auth0:Audience" "YOUR_AUTH0_API_AUDIENCE" --project Lists.Api
dotnet user-secrets set "Auth0:ManagementAudience" "https://YOUR_AUTH0_DOMAIN/api/v2/" --project Lists.Api
dotnet user-secrets set "Auth0:ManagementClientId" "YOUR_MANAGEMENT_CLIENT_ID" --project Lists.Api
dotnet user-secrets set "Auth0:ManagementClientSecret" "YOUR_MANAGEMENT_CLIENT_SECRET" --project Lists.Api
```

Install the Entity Framework tool and apply the database migrations:

```bash
dotnet tool install --global dotnet-ef --version 10.0.8
dotnet ef database update --project Lists.Api --startup-project Lists.Api
```

Start the API:

```bash
dotnet run --project Lists.Api
```

The development API runs at `http://localhost:5180`.

### Frontend

Copy the example environment file and update it for your Auth0 application:

```bash
cd Lists.Web
cp .env.example .env.local
npm ci
npm run dev
```

The development frontend runs at `http://localhost:5173`.

## Checks

### API

The integration tests use Testcontainers to start a temporary
`postgres:18-alpine` database, apply the migrations, and remove the container
after the test run. Docker must be running; the tests do not use the development
database configured above.

Run the API checks from the repository root:

```bash
dotnet build
dotnet test
```

### Frontend

Run the frontend checks from `Lists.Web`:

```bash
npm run lint
npm test -- --run
npm run build
```

## Licence

This project is licensed under the [MIT Licence](LICENSE).
