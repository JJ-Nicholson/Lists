using Lists.Api.Models;

namespace Lists.Api.Repositories.ListAccessEntries.Projections;

public record ListAccessEntryProjection(
    string Username,
    ListAccessRole Role
);
