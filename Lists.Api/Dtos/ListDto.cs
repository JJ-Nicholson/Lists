namespace Lists.Api.Dtos;

public record ListDto(
    int Id,
    string Name,
    uint Version,
    List<ItemDto> Items
);
