namespace Lists.Api.Dtos;

public record ListsPageDto(
    IReadOnlyList<ListSummaryDto> Lists,
    PageDto Page
);

