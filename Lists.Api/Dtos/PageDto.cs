namespace Lists.Api.Dtos;

public record PageDto(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);
