namespace Lists.Api.Models;

public class ListItemEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public bool IsCompleted { get; set; }
    public uint Version { get; set; }
    public ListEntity List { get; set; } = null!;
    public int ListId { get; set; }
}
