export const DEFAULT_PAGE = 1;
export const DEFAULT_SORT_DIRECTION = "asc";
export type SortDirection = typeof DEFAULT_SORT_DIRECTION | "desc";

export const DEFAULT_LISTS_PAGE_SIZE = 96;
export const LISTS_PAGE_SIZE_OPTIONS: readonly number[] = [
    3,
    6,
    12,
    24,
    48,
    DEFAULT_LISTS_PAGE_SIZE,
    1000,
];
export const SEARCH_DEBOUNCE_MS = 300;
