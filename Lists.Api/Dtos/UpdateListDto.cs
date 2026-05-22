using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record UpdateListDto(
    [Required][StringLength(100, MinimumLength = 1)] string Name,
    [Required] uint? Version
);
