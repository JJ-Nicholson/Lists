using Lists.Api.Dtos;
using Lists.Api.Models;

namespace Lists.Api.Endpoints.ListItems;

internal static class ListItemsEndpointsDtoMappings
{
    internal static ItemDto ToItemDto(ListItemEntity item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Amount,
            item.IsCompleted,
            item.Version
        );
    }
}
