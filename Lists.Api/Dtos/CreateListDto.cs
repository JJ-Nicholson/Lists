using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record CreateListDto(
    [Required][StringLength(100, MinimumLength = 1)] string Name
);
