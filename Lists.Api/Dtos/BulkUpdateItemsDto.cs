using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record BulkUpdateItemsDto(
    [Required][MinLength(1)] IReadOnlyList<BulkUpdateItemDto> Items
);
