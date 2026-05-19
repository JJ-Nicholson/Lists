namespace Lists.Api.Models;

public class ListEntity
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public uint Version { get; set; }

    public List<ListItemEntity> Items { get; set; } = [];

    public List<ListAccessEntity> AccessEntries { get; set; } = [];
}
