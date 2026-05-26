using Lists.Api.Dtos;
using Lists.Api.Models;

namespace Lists.Api.Endpoints.Users;

internal static class UsersEndpointsDtoMappings
{
    internal static UserDto ToUserDto(UserEntity user) =>
        new UserDto(
            user.Username,
            user.Username is null
        );
}
