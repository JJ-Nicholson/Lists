namespace Lists.Api.Models;

public class ListAccessEntity
{
    public int ListId { get; set; }
    public int UserId { get; set; }
    public ListAccessRole Role { get; set; }
    public ListEntity List { get; set; } = null!;
    public UserEntity User { get; set; } = null!;
}
