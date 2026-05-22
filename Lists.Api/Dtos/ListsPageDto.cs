namespace Lists.Api.Dtos;

public record ListsPageDto(
    List<ListSummaryDto> Items,
    PageDto Page
);

