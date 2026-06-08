using Lists.Api.Dtos;
using Lists.Api.Services.ListItems;

using static Lists.Api.Endpoints.ListItems.ListItemsEndpointsDtoMappings;

namespace Lists.Api.Endpoints.ListItems;

public static class ListItemsEndpoints
{
    public static void MapListItemsEndpoints(this WebApplication app)
    {
        var itemsGroup = app.MapGroup("/lists/{listId}/items").RequireAuthorization();

        // POST /lists/{listId}/items (Add an item to a list)
        itemsGroup.MapPost("/", async (
            int listId,
            CreateItemDto dto,
            IListItemsService listItemsService,
            CancellationToken cancellationToken) =>
        {
            await listItemsService.CreateListItemEntityAsync(
                listId,
                dto.Name,
                dto.Amount,
                cancellationToken);

            // The frontend refetches after creating an item, so no item representation is needed.
            return Results.NoContent();
        });

        // PATCH /lists/{listId}/items/mark-complete (marks all passed items as complete)
        itemsGroup.MapPatch("/mark-complete", async (
            int listId,
            BulkUpdateItemsDto dto,
            IListItemsService listItemsService,
            CancellationToken cancellationToken) =>
        {
            var updatedItems = await listItemsService.UpdateItemEntitiesCompletionAsync(
                listId,
                true,
                dto.Items,
                cancellationToken);

            return Results.Ok(updatedItems.Select(ToItemDto).ToList());
        });

        // PATCH /lists/{listId}/items/mark-incomplete (marks all passed items as incomplete)
        itemsGroup.MapPatch("/mark-incomplete", async (
            int listId,
            BulkUpdateItemsDto dto,
            IListItemsService listItemsService,
            CancellationToken cancellationToken) =>
        {
            var updatedItems = await listItemsService.UpdateItemEntitiesCompletionAsync(
                listId,
                false,
                dto.Items,
                cancellationToken);

            return Results.Ok(updatedItems.Select(ToItemDto).ToList());
        });

        // PATCH /lists/{listId}/items/{itemId} (Update a specific item)
        itemsGroup.MapPatch("/{itemId}", async (
            int listId,
            int itemId,
            UpdateItemDto dto,
            IListItemsService listItemsService,
            CancellationToken cancellationToken) =>
        {
            var updatedItem = await listItemsService.UpdateListItemEntityAsync(
                listId,
                itemId,
                dto.Name,
                dto.Amount,
                dto.IsCompleted,
                dto.Version!.Value,
                cancellationToken);

            return Results.Ok(ToItemDto(updatedItem));
        });

        // DELETE /lists/{listId}/items/{itemId}?version=123 (Delete a specific item)
        itemsGroup.MapDelete("/{itemId}", async (
            int listId,
            int itemId,
            uint version,
            IListItemsService listItemsService,
            CancellationToken cancellationToken) =>
        {
            await listItemsService.DeleteListItemEntityAsync(listId, itemId, version, cancellationToken);

            return Results.NoContent();
        });
    }
}
