namespace Lists.Api.Dtos;

public record ListSummaryDto(
    int Id,
    string Name,
    uint Version,
    int ItemCount,
    int CompletedItemCount,
    string CurrentUserRole,
    string OwnerUsername
);
