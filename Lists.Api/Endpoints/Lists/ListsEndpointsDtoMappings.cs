using Lists.Api.Dtos;
using Lists.Api.Models;
using Lists.Api.Repositories.Lists.Projections;

namespace Lists.Api.Endpoints.Lists;

internal static class ListsEndpointsDtoMappings
{
    internal static ListsPageDto ToListsPageDto(ListSummariesPageProjection page)
    {
        return new ListsPageDto(
            page.Lists.Select(ToListSummaryDto).ToList(),
            ToPageDto(page.Page)
        );
    }

    private static ListSummaryDto ToListSummaryDto(ListSummaryProjection summary)
    {
        return new ListSummaryDto(
            summary.Id,
            summary.Name,
            summary.Version,
            summary.ItemCount,
            summary.CompletedItemCount,
            ToRoleDto(summary.CurrentUserRole),
            summary.OwnerUsername
        );
    }

    private static string ToRoleDto(ListAccessRole role)
    {
        return role.ToString().ToLowerInvariant();
    }

    internal static ListItemsPageDto ToListItemsPageDto(ListDetailsPageProjection list)
    {
        return new ListItemsPageDto(
            list.Id,
            list.Name,
            list.Version,
            list.Items.Select(ToItemDto).ToList(),
            ToPageDto(list.Page),
            list.TotalPrice
        );
    }

    private static ItemDto ToItemDto(ListItemProjection item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Price,
            item.IsCompleted,
            item.Version
        );
    }

    internal static ListDto ToListDto(ListEntity list)
    {
        return new ListDto(
            list.Id,
            list.Name,
            list.Version,
            list.Items.Select(ToItemDto).ToList()
        );
    }

    private static ItemDto ToItemDto(ListItemEntity item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Price,
            item.IsCompleted,
            item.Version
        );
    }

    private static PageDto ToPageDto(PageInfo page)
    {
        return new PageDto(
            page.Page,
            page.PageSize,
            page.TotalCount,
            page.TotalPages
        );
    }
}
