namespace Lists.Api.Dtos;

public record ListDto(
    int Id,
    string Name,
    string? UnitLabel,
    uint Version,
    IReadOnlyList<ItemDto> Items
);
