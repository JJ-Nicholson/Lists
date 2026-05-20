using Microsoft.EntityFrameworkCore;
using Lists.Api.Models;
using ListEntity = Lists.Api.Models.ListEntity;

namespace Lists.Api.Data;

public class ListsContext(DbContextOptions<ListsContext> options) : DbContext(options)
{
    public DbSet<ListEntity> Lists => Set<ListEntity>();
    public DbSet<ListItemEntity> ListItems => Set<ListItemEntity>();
    public DbSet<ListAccessEntity> ListAccesses => Set<ListAccessEntity>();
    public DbSet<UserEntity> Users => Set<UserEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {

        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ListAccessEntity>()
            .HasKey(a => new { a.ListId, a.UserId });

        modelBuilder.Entity<ListAccessEntity>()
            .Property(a => a.Role)
            .HasConversion<string>();

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
            .Property(i => i.Version)
            .IsRowVersion();

        modelBuilder.Entity<ListItemEntity>()
            .Property(i => i.Price)
            .HasPrecision(10, 2);

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
