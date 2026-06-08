namespace Lists.Api.Dtos;

public record ItemDto(
    int Id,
    string Name,
    decimal Amount,
    bool IsCompleted,
    uint Version
);
