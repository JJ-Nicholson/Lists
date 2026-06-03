namespace Lists.Api.Models;

public class UserEntity
{
    public int Id { get; set; }
    public required string Auth0UserId { get; set; }
    public string? Username { get; set; }
    public List<ListAccessEntryEntity> ListAccesses { get; set; } = [];
}
