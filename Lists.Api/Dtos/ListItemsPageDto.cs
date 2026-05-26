namespace Lists.Api.Dtos;

public record ListItemsPageDto(
    int Id,
    string Name,
    uint Version,
    IReadOnlyList<ItemDto> Items,
    PageDto ItemsPage,
    decimal TotalPrice
);
