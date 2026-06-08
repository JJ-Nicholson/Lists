namespace Lists.Api.Repositories.Lists.Projections;

public record ListDetailsProjection(
    int Id,
    string Name,
    string? UnitLabel,
    uint Version,
    IReadOnlyList<ListItemProjection> Items,
    decimal TotalAmount
);

public record ListItemProjection(
    int Id,
    string Name,
    decimal Amount,
    bool IsCompleted,
    uint Version
);
