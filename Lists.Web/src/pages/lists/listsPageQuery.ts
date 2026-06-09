import {
    DEFAULT_LISTS_PAGE_SIZE,
    DEFAULT_SORT_DIRECTION,
    LISTS_PAGE_SIZE_OPTIONS,
    type SortDirection,
} from "./listsPageConfig";

type ListsQueryValues = {
    page: number;
    pageSize: number;
    search: string;
    sortDirection: SortDirection;
};

export type ListsQueryParams = {
    page: number;
    pageSize?: number;
    search: string;
    sortDirection: SortDirection;
};

export function getPositiveInteger(
    value: string | null,
    defaultValue: number,
): number {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : defaultValue;
}

export function getListsPageSize(value: string | null): number {
    const pageSize = getPositiveInteger(value, DEFAULT_LISTS_PAGE_SIZE);

    return LISTS_PAGE_SIZE_OPTIONS.includes(pageSize)
        ? pageSize
        : DEFAULT_LISTS_PAGE_SIZE;
}

export function getSortDirection(value: string | null): SortDirection {
    return value === "desc" ? "desc" : DEFAULT_SORT_DIRECTION;
}

export function getListsQueryParams({
    page,
    pageSize,
    search,
    sortDirection,
}: ListsQueryValues): ListsQueryParams {
    return {
        page,
        pageSize: pageSize === DEFAULT_LISTS_PAGE_SIZE ? undefined : pageSize,
        search,
        sortDirection,
    };
}
