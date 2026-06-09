using System.ComponentModel.DataAnnotations;

namespace Lists.Api.Dtos;

public record GrantAccessDto(
    [Required]
    [StringLength(50, MinimumLength = 2)]
    [RegularExpression(
        "^[a-zA-Z0-9][a-zA-Z0-9_-]*$",
        ErrorMessage = "Username can only use letters, numbers, underscores, and hyphens.")]
    string Username
);
