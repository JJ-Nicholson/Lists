using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record GrantAccessDto(
    [Required][StringLength(100, MinimumLength = 1)] string Username
);
