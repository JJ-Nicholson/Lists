namespace Lists.Api.Repositories.Lists.Projections;

public record PageInfo(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);
