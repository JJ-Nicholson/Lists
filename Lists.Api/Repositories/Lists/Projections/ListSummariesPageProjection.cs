using Lists.Api.Models;

namespace Lists.Api.Repositories.Lists.Projections;

public record ListSummariesPageProjection(
    IReadOnlyList<ListSummaryProjection> Lists,
    PageInfo Page
);

public record ListSummaryProjection(
    int Id,
    string Name,
    uint Version,
    int ItemCount,
    int CompletedItemCount,
    ListAccessRole CurrentUserRole,
    string OwnerUsername
);
