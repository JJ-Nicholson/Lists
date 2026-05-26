using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record BulkUpdateItemDto(
    [Range(1, int.MaxValue)] int Id,
    [Required] uint? Version
);
