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
            ToListsPageInfoDto(page.Page)
        );
    }

    private static ListSummaryDto ToListSummaryDto(ListSummaryProjection summary)
    {
        return new ListSummaryDto(
            summary.Id,
            summary.Name,
            summary.UnitLabel,
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

    internal static ListDetailsDto ToListDetailsDto(ListDetailsProjection list)
    {
        return new ListDetailsDto(
            list.Id,
            list.Name,
            list.UnitLabel,
            list.Version,
            list.Items.Select(ToItemDto).ToList(),
            list.TotalAmount
        );
    }

    private static ItemDto ToItemDto(ListItemProjection item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Amount,
            item.IsCompleted,
            item.Version
        );
    }

    internal static ListDto ToListDto(ListEntity list)
    {
        return new ListDto(
            list.Id,
            list.Name,
            list.UnitLabel,
            list.Version,
            list.Items.Select(ToItemDto).ToList()
        );
    }

    private static ItemDto ToItemDto(ListItemEntity item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Amount,
            item.IsCompleted,
            item.Version
        );
    }

    private static ListsPageInfoDto ToListsPageInfoDto(ListSummariesPageInfoProjection page)
    {
        return new ListsPageInfoDto(
            page.Page,
            page.PageSize,
            page.TotalCount,
            page.TotalPages
        );
    }
}
