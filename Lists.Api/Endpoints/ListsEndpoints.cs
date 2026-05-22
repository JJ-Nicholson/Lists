using Microsoft.EntityFrameworkCore;
using Lists.Api.Data;
using Lists.Api.Dtos;
using Lists.Api.Models;
using Lists.Api.Services;
using ListEntity = Lists.Api.Models.ListEntity;

namespace Lists.Api.Endpoints;

public static class ListsEndpoints
{
    private const string GetListEndpointName = "GetListById";
    private const string LikeEscapeCharacter = "\\";
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 96;
    private const int MaxPageSize = 1000;

    public static void MapListsEndpoints(this WebApplication app)
    {

        var listsGroup = app.MapGroup("/lists").RequireAuthorization();

        // GET /lists (Accessible list summaries for the current user, with optional search, sorting, and pagination)
        listsGroup.MapGet("/", async (
            string? search,
            string? sortBy,
            string? sortDirection,
            int? page,
            int? pageSize,
            ListsContext dbContext,
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var (pageValue, pageSizeValue, paginationError) = GetPagination(page, pageSize);

            if (paginationError is not null)
            {
                return paginationError;
            }

            var (currentUser, currentUserError) = await GetCurrentUserForListsAsync(
                accountService,
                cancellationToken);

            if (currentUserError is not null)
            {
                return currentUserError;
            }

            var listsQuery =
                from list in dbContext.Lists
                join currentAccess in dbContext.ListAccesses.Where(a =>
                        a.UserId == currentUser.Id)
                    on list.Id equals currentAccess.ListId
                join ownerAccess in dbContext.ListAccesses.Where(a =>
                        a.Role == ListAccessRole.Owner)
                    on list.Id equals ownerAccess.ListId
                join owner in dbContext.Users
                    on ownerAccess.UserId equals owner.Id
                select new
                {
                    List = list,
                    CurrentUserRole = currentAccess.Role,
                    OwnerUsername = owner.Username!
                };

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchPattern = $"%{EscapeLikePattern(search.Trim())}%";

                listsQuery = listsQuery.Where(l =>
                    EF.Functions.ILike(l.List.Name, searchPattern, LikeEscapeCharacter));
            }

            var sortValue = sortBy?.Trim().ToLowerInvariant();
            var directionValue = sortDirection?.Trim().ToLowerInvariant();

            if (sortValue is not null and not "" and not "name")
            {
                return Results.BadRequest(new { message = "Invalid list sort." });
            }

            if (directionValue is not null and not "" and not "asc" and not "desc")
            {
                return Results.BadRequest(new { message = "Invalid list sort direction." });
            }

            var descending = directionValue == "desc";

            listsQuery = descending
                ? listsQuery.OrderByDescending(l => l.List.Name).ThenBy(l => l.List.Id)
                : listsQuery.OrderBy(l => l.List.Name).ThenBy(l => l.List.Id);

            var totalCount = await listsQuery.CountAsync(cancellationToken);
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSizeValue);
            var effectivePage = totalPages == 0
                ? DefaultPage
                : Math.Min(pageValue, totalPages);

            var userLists = await listsQuery
                .AsNoTracking()
                .Skip((effectivePage - 1) * pageSizeValue)
                .Take(pageSizeValue)
                .Select(l => new
                {
                    l.List.Id,
                    l.List.Name,
                    l.List.Version,
                    ItemCount = l.List.Items.Count,
                    CompletedItemCount = l.List.Items.Count(i => i.IsCompleted),
                    l.CurrentUserRole,
                    l.OwnerUsername
                })
                .ToListAsync(cancellationToken);

            var listSummaries = userLists
                .Select(l => new ListSummaryDto(
                    l.Id,
                    l.Name,
                    l.Version,
                    l.ItemCount,
                    l.CompletedItemCount,
                    ToRoleDto(l.CurrentUserRole),
                    l.OwnerUsername
                ))
                .ToList();

            return Results.Ok(new ListsPageDto(
                listSummaries,
                new PageDto(effectivePage, pageSizeValue, totalCount, totalPages)
            ));
        });

        // GET /lists/{listId} (Details of a specific list, with paged items returned from a search)
        listsGroup.MapGet("/{listId}", async (
            int listId,
            string? search,
            string? status,
            string? sortBy,
            string? sortDirection,
            int? page,
            int? pageSize,
            ListsContext dbContext,
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var (pageValue, pageSizeValue, paginationError) = GetPagination(page, pageSize);

            if (paginationError is not null)
            {
                return paginationError;
            }

            var (currentUser, currentUserError) = await GetCurrentUserForListsAsync(
                accountService,
                cancellationToken);

            if (currentUserError is not null)
            {
                return currentUserError;
            }

            var hasListAccess = await HasListAccessAsync(
                dbContext,
                listId,
                currentUser.Id,
                cancellationToken);

            if (!hasListAccess)
            {
                return Results.NotFound();
            }

            var list = await dbContext.Lists
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == listId, cancellationToken);

            if (list is null)
            {
                return Results.NotFound();
            }

            var itemsQuery = dbContext.ListItems
                .AsNoTracking()
                .Where(i => i.ListId == listId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchPattern = $"%{EscapeLikePattern(search.Trim())}%";

                itemsQuery = itemsQuery.Where(i =>
                    EF.Functions.ILike(i.Name, searchPattern, LikeEscapeCharacter));
            }

            var statusValue = status?.Trim().ToLowerInvariant();
            var sortValue = sortBy?.Trim().ToLowerInvariant();
            var directionValue = sortDirection?.Trim().ToLowerInvariant();

            if (statusValue is not null and not "" and not "all" and not "active" and not "completed")
            {
                return Results.BadRequest(new { message = "Invalid item status." });
            }

            if (sortValue is not null and not "" and not "name" and not "price" and not "status")
            {
                return Results.BadRequest(new { message = "Invalid item sort." });
            }

            if (directionValue is not null and not "" and not "asc" and not "desc")
            {
                return Results.BadRequest(new { message = "Invalid item sort direction." });
            }

            itemsQuery = statusValue switch
            {
                null or "" or "all" => itemsQuery,
                "active" => itemsQuery.Where(i => !i.IsCompleted),
                "completed" => itemsQuery.Where(i => i.IsCompleted),
                _ => throw new BadHttpRequestException("Invalid item status.")
            };

            var descending = directionValue == "desc";

            itemsQuery = sortValue switch
            {
                null or "" or "name" => descending
                    ? itemsQuery.OrderByDescending(i => i.Name).ThenBy(i => i.Id)
                    : itemsQuery.OrderBy(i => i.Name).ThenBy(i => i.Id),

                "price" => descending
                    ? itemsQuery.OrderByDescending(i => i.Price).ThenBy(i => i.Id)
                    : itemsQuery.OrderBy(i => i.Price).ThenBy(i => i.Id),

                "status" => descending
                    ? itemsQuery.OrderByDescending(i => i.IsCompleted).ThenBy(i => i.Id)
                    : itemsQuery.OrderBy(i => i.IsCompleted).ThenBy(i => i.Id),

                _ => throw new BadHttpRequestException("Invalid item sort.")
            };

            var totalCount = await itemsQuery.CountAsync(cancellationToken);
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSizeValue);
            var effectivePage = totalPages == 0
                ? DefaultPage
                : Math.Min(pageValue, totalPages);
            var totalPrice = await itemsQuery.SumAsync(i => (decimal?)i.Price, cancellationToken) ?? 0;

            var itemEntities = await itemsQuery
                .Skip((effectivePage - 1) * pageSizeValue)
                .Take(pageSizeValue)
                .ToListAsync(cancellationToken);

            var items = itemEntities
                .Select(ToItemDto)
                .ToList();

            var listDto = new ListItemsPageDto(
                list.Id,
                list.Name,
                list.Version,
                items,
                new PageDto(effectivePage, pageSizeValue, totalCount, totalPages),
                totalPrice
            );

            return Results.Ok(listDto);
        }).WithName(GetListEndpointName);


        // POST /lists (Create a new list)
        listsGroup.MapPost("/", async (
            CreateListDto dto,
            ListsContext dbContext,
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var (currentUser, currentUserError) = await GetCurrentUserForListsAsync(
                accountService,
                cancellationToken);

            if (currentUserError is not null)
            {
                return currentUserError;
            }

            var newList = new ListEntity
            {
                Name = dto.Name,
                AccessEntries =
                [
                    new ListAccessEntity
                    {
                        UserId = currentUser.Id,
                        Role = ListAccessRole.Owner
                    }
                ]
            };

            dbContext.Lists.Add(newList);
            await dbContext.SaveChangesAsync(cancellationToken);

            return Results.CreatedAtRoute(
                GetListEndpointName,
                new { listId = newList.Id },
                ToListDto(newList));
        });


        // PATCH /lists/{listId} (Update a specific list)
        listsGroup.MapPatch("/{listId}", async (
            int listId,
            UpdateListDto dto,
            ListsContext dbContext,
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var (currentUser, currentUserError) = await GetCurrentUserForListsAsync(
                accountService,
                cancellationToken);

            if (currentUserError is not null)
            {
                return currentUserError;
            }

            var hasListAccess = await HasListAccessAsync(
                dbContext,
                listId,
                currentUser.Id,
                cancellationToken);

            if (!hasListAccess)
            {
                return Results.NotFound();
            }

            var list = await dbContext.Lists
                .Include(l => l.Items)
                .FirstOrDefaultAsync(l => l.Id == listId, cancellationToken);

            if (list is null)
            {
                return Results.NotFound();
            }

            dbContext.Entry(list).Property(l => l.Version).OriginalValue = dto.Version!.Value;

            list.Name = dto.Name;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Conflict(new
                {
                    message = "List was modified. Reload and try again."
                });
            }

            return Results.Ok(ToListDto(list));
        });


        // DELETE /lists/{listId}?version=123 (Delete a specific list)
        listsGroup.MapDelete("/{listId}", async (
            int listId,
            uint version,
            ListsContext dbContext,
            IAccountService accountService,
            CancellationToken cancellationToken) =>
        {
            var (currentUser, currentUserError) = await GetCurrentUserForListsAsync(
                accountService,
                cancellationToken);

            if (currentUserError is not null)
            {
                return currentUserError;
            }

            var hasListAccess = await HasListAccessAsync(
                dbContext,
                listId,
                currentUser.Id,
                cancellationToken);

            if (!hasListAccess)
            {
                return Results.NotFound();
            }

            var isListOwner = await IsListOwnerAsync(
                dbContext,
                listId,
                currentUser.Id,
                cancellationToken);

            if (!isListOwner)
            {
                return Results.Forbid();
            }

            var list = await dbContext.Lists
                .FirstOrDefaultAsync(l => l.Id == listId, cancellationToken);

            if (list is null)
            {
                return Results.NoContent();
            }

            dbContext.Entry(list).Property(l => l.Version).OriginalValue = version;
            dbContext.Lists.Remove(list);

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                return Results.Conflict(new
                {
                    message = "List was modified. Reload and try again."
                });
            }

            return Results.NoContent();
        });
    }

    private static string EscapeLikePattern(string value)
    {
        return value
            .Replace("\\", "\\\\")
            .Replace("%", "\\%")
            .Replace("_", "\\_");
    }

    private static string ToRoleDto(ListAccessRole role)
    {
        return role.ToString().ToLowerInvariant();
    }

    private static ListDto ToListDto(ListEntity list)
    {
        return new ListDto(
            list.Id,
            list.Name,
            list.Version,
            list.Items.Select(ToItemDto).ToList()
        );
    }

    private static ItemDto ToItemDto(ListItemEntity item)
    {
        return new ItemDto(
            item.Id,
            item.Name,
            item.Price,
            item.IsCompleted,
            item.Version
        );
    }

    private static (int Page, int PageSize, IResult? Error) GetPagination(int? page, int? pageSize)
    {
        var pageValue = page ?? DefaultPage;
        var pageSizeValue = pageSize ?? DefaultPageSize;

        if (pageValue < 1)
        {
            return (
                pageValue,
                pageSizeValue,
                Results.BadRequest(new { message = "Page must be 1 or greater." }));
        }

        if (pageSizeValue < 1 || pageSizeValue > MaxPageSize)
        {
            return (
                pageValue,
                pageSizeValue,
                Results.BadRequest(new { message = $"Page size must be between 1 and {MaxPageSize}." }));
        }

        return (pageValue, pageSizeValue, null);
    }

    private static Task<bool> HasListAccessAsync(
        ListsContext dbContext,
        int listId,
        int userId,
        CancellationToken cancellationToken)
    {
        return dbContext.ListAccesses.AnyAsync(a =>
            a.ListId == listId &&
            a.UserId == userId,
            cancellationToken);
    }

    private static Task<bool> IsListOwnerAsync(
        ListsContext dbContext,
        int listId,
        int userId,
        CancellationToken cancellationToken)
    {
        return dbContext.ListAccesses.AnyAsync(a =>
            a.ListId == listId &&
            a.UserId == userId &&
            a.Role == ListAccessRole.Owner,
            cancellationToken);
    }

    private static async Task<(UserEntity CurrentUser, IResult? Error)> GetCurrentUserForListsAsync(
        IAccountService accountService,
        CancellationToken cancellationToken)
    {
        var currentUser = await accountService.GetOrCreateCurrentUserAsync(cancellationToken);

        return (currentUser, RequireUsername(currentUser));
    }

    private static IResult? RequireUsername(UserEntity user)
    {
        if (!string.IsNullOrWhiteSpace(user.Username))
        {
            return null;
        }

        return Results.Conflict(new { message = "Choose a username before using lists." });
    }
}
