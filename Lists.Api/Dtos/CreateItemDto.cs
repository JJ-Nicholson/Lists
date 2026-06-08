using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record CreateItemDto(
    [Required][StringLength(100, MinimumLength = 1)] string Name,
    [Range(typeof(decimal), "-99999999.99", "99999999.99")] decimal Amount
);
