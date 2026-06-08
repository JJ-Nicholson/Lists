namespace Lists.Api.Dtos;

public record ListDetailsDto(
    int Id,
    string Name,
    string? UnitLabel,
    uint Version,
    IReadOnlyList<ItemDto> Items,
    decimal TotalAmount
);
