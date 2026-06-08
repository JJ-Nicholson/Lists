namespace Lists.Api.Dtos;

public record ListsPageDto(
    IReadOnlyList<ListSummaryDto> Lists,
    ListsPageInfoDto Page
);

public record ListsPageInfoDto(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);
