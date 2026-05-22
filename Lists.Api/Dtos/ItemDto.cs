namespace Lists.Api.Dtos;

public record ItemDto(
    int Id,
    string Name,
    decimal Price,
    bool IsCompleted,
    uint Version
);