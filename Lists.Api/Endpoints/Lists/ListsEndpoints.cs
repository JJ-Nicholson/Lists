using Lists.Api.Dtos;
using Lists.Api.Services.Lists;

using static Lists.Api.Endpoints.Lists.ListsEndpointsDtoMappings;
using static Lists.Api.Endpoints.Lists.ListsEndpointsPagination;

namespace Lists.Api.Endpoints.Lists;

public static class ListsEndpoints
{
    private const string GetListEndpointName = "GetListById";

    public static void MapListsEndpoints(this WebApplication app)
    {
        var listsGroup = app.MapGroup("/lists").RequireAuthorization();

        // GET /lists (Accessible list summaries for the current user, with optional search, sorting, and pagination)
        listsGroup.MapGet("/", async (
            string? search,
            string? sortDirection,
            int? page,
            int? pageSize,
            IListsService listsService,
            CancellationToken cancellationToken) =>
        {
            var (pageValue, pageSizeValue) = GetPagination(page, pageSize);

            var result = await listsService.GetListSummariesPageAsync(
                search,
                sortDirection,
                pageValue,
                pageSizeValue,
                cancellationToken);

            return Results.Ok(ToListsPageDto(result));
        });

        // GET /lists/{listId} (Details of a specific list, with items returned from a search)
        listsGroup.MapGet("/{listId}", async (
            int listId,
            string? search,
            string? status,
            string? sortBy,
            string? sortDirection,
            IListsService listsService,
            CancellationToken cancellationToken) =>
        {
            var result = await listsService.GetListDetailsByIdAsync(
                listId,
                search,
                status,
                sortBy,
                sortDirection,
                cancellationToken);

            return Results.Ok(ToListDetailsDto(result));
        }).WithName(GetListEndpointName);

        // POST /lists (Create a new list)
        listsGroup.MapPost("/", async (
            CreateListDto dto,
            IListsService listsService,
            CancellationToken cancellationToken) =>
        {
            var newList = await listsService.CreateListEntityAsync(
                dto.Name,
                dto.UnitLabel,
                cancellationToken);

            return Results.CreatedAtRoute(
                GetListEndpointName,
                new { listId = newList.Id },
                ToListDto(newList));
        });

        // PATCH /lists/{listId} (Update a specific list)
        listsGroup.MapPatch("/{listId}", async (
            int listId,
            UpdateListDto dto,
            IListsService listsService,
            CancellationToken cancellationToken) =>
        {
            var updatedList = await listsService.UpdateListEntityAsync(
                listId,
                dto.Version!.Value,
                dto.Name,
                dto.UnitLabel,
                cancellationToken);

            return Results.Ok(ToListDto(updatedList));
        });

        // DELETE /lists/{listId}?version=123 (Delete a specific list)
        listsGroup.MapDelete("/{listId}", async (
            int listId,
            uint version,
            IListsService listsService,
            CancellationToken cancellationToken) =>
        {
            await listsService.DeleteListEntityAsync(listId, version, cancellationToken);

            return Results.NoContent();
        });
    }
}
