using Lists.Api.Models;

namespace Lists.Api.Repositories.Lists.Projections;

public record ListSummariesPageProjection(
    IReadOnlyList<ListSummaryProjection> Lists,
    ListSummariesPageInfoProjection Page
);

public record ListSummariesPageInfoProjection(
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages
);

public record ListSummaryProjection(
    int Id,
    string Name,
    string? UnitLabel,
    uint Version,
    int ItemCount,
    int CompletedItemCount,
    ListAccessRole CurrentUserRole,
    string OwnerUsername
);
