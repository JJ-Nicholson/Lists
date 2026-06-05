FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

RUN dotnet tool install --global dotnet-ef --version 10.0.8
ENV PATH="${PATH}:/root/.dotnet/tools"

COPY Lists.Api/Lists.Api.csproj Lists.Api/
RUN dotnet restore Lists.Api/Lists.Api.csproj

COPY Lists.Api/ Lists.Api/
RUN ConnectionStrings__Lists="Host=localhost;Port=5432;Database=lists;Username=postgres;Password=postgres" \
    dotnet ef migrations bundle \
    --project Lists.Api/Lists.Api.csproj \
    --startup-project Lists.Api/Lists.Api.csproj \
    --configuration Release \
    --output /app/migrate \
    --force

RUN dotnet publish Lists.Api/Lists.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=build /app/migrate ./migrate

RUN chmod +x ./migrate

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

CMD ["dotnet", "Lists.Api.dll"]
