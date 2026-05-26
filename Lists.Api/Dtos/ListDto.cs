namespace Lists.Api.Dtos;

public record ListDto(
    int Id,
    string Name,
    uint Version,
    IReadOnlyList<ItemDto> Items
);
