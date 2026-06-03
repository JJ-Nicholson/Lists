using Lists.Api.Dtos;
using Lists.Api.Models;
using Lists.Api.Repositories.ListAccessEntries.Projections;

namespace Lists.Api.Endpoints.ListAccessEntries;

internal static class ListAccessEntriesEndpointsDtoMappings
{
    internal static ListAccessEntryDto ToListAccessEntryDto(ListAccessEntryProjection accessEntry)
    {
        return new ListAccessEntryDto(
            accessEntry.Username,
            ToRoleDto(accessEntry.Role)
        );
    }

    private static string ToRoleDto(ListAccessRole role)
    {
        return role.ToString().ToLowerInvariant();
    }
}
