using Microsoft.EntityFrameworkCore;

using Lists.Api.Models;
using ListEntity = Lists.Api.Models.ListEntity;

namespace Lists.Api.Data;

public class ListsContext(DbContextOptions<ListsContext> options) : DbContext(options)
{
    public DbSet<ListEntity> Lists => Set<ListEntity>();
    public DbSet<ListItemEntity> ListItems => Set<ListItemEntity>();
    public DbSet<ListAccessEntryEntity> ListAccesses => Set<ListAccessEntryEntity>();
    public DbSet<UserEntity> Users => Set<UserEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ListAccessEntryEntity>()
            .HasKey(a => new { a.ListId, a.UserId });

        modelBuilder.Entity<ListAccessEntryEntity>()
            .ToTable("ListAccesses", table => table.HasCheckConstraint(
                "CK_ListAccesses_Role_Valid",
                "\"Role\" IN ('Owner', 'Editor')"));

        modelBuilder.Entity<ListAccessEntryEntity>()
            .Property(a => a.Role)
            .HasConversion<string>();

        modelBuilder.Entity<ListEntity>()
            .ToTable("Lists", table => table.HasCheckConstraint(
                "CK_Lists_Name_NotEmpty",
                "length(trim(\"Name\")) >= 1"));

        modelBuilder.Entity<ListEntity>()
            .Property(l => l.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<ListEntity>()
            .Property(l => l.UnitLabel)
            .HasMaxLength(30);

        modelBuilder.Entity<ListEntity>()
            .HasMany(l => l.Items)
            .WithOne(i => i.List)
            .HasForeignKey(i => i.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ListEntity>()
            .HasMany(l => l.AccessEntries)
            .WithOne(a => a.List)
            .HasForeignKey(a => a.ListId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserEntity>()
            .HasMany(u => u.ListAccesses)
            .WithOne(a => a.User)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ListEntity>()
            .Property(l => l.Version)
            .IsRowVersion();

        modelBuilder.Entity<ListItemEntity>()
            .ToTable("ListItems", table => table.HasCheckConstraint(
                "CK_ListItems_Name_NotEmpty",
                "length(trim(\"Name\")) >= 1"));

        modelBuilder.Entity<ListItemEntity>()
            .Property(i => i.Version)
            .IsRowVersion();

        modelBuilder.Entity<ListItemEntity>()
            .Property(i => i.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<ListItemEntity>()
            .Property(i => i.Amount)
            .HasPrecision(10, 2);

        modelBuilder.Entity<UserEntity>()
            .ToTable("Users", table => table.HasCheckConstraint(
                "CK_Users_Username_Valid",
                "\"Username\" IS NULL OR \"Username\" ~ '^[a-z0-9][a-z0-9_-]{1,49}$'"));

        modelBuilder.Entity<UserEntity>()
            .Property(u => u.Username)
            .HasMaxLength(50);

        modelBuilder.Entity<UserEntity>()
            .HasIndex(u => u.Auth0UserId)
            .IsUnique();

        modelBuilder.Entity<UserEntity>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}
