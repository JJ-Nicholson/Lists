using Lists.Api.Errors;

namespace Lists.Api.Endpoints.Lists;

internal static class ListsEndpointsPagination
{
    private const int DefaultPage = 1;
    private const int DefaultPageSize = 12;
    private const int MaxPageSize = 1000;

    internal static (int Page, int PageSize) GetPagination(int? page, int? pageSize)
    {
        var pageValue = page ?? DefaultPage;
        var pageSizeValue = pageSize ?? DefaultPageSize;

        if (pageValue < 1)
        {
            throw new BadRequestException("Page must be 1 or greater.");
        }

        if (pageSizeValue < 1 || pageSizeValue > MaxPageSize)
        {
            throw new BadRequestException($"Page size must be between 1 and {MaxPageSize}.");
        }

        return (pageValue, pageSizeValue);
    }
}
