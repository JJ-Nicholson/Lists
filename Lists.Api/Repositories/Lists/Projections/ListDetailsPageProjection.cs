namespace Lists.Api.Repositories.Lists.Projections;

public record ListDetailsPageProjection(
    int Id,
    string Name,
    uint Version,
    IReadOnlyList<ListItemProjection> Items,
    PageInfo Page,
    decimal TotalPrice
);

public record ListItemProjection(
    int Id,
    string Name,
    decimal Price,
    bool IsCompleted,
    uint Version
);
