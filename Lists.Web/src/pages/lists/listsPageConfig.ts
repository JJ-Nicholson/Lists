export const DEFAULT_PAGE = 1;
export const DEFAULT_SORT_DIRECTION = "asc";
export type SortDirection = typeof DEFAULT_SORT_DIRECTION | "desc";

export const DEFAULT_LISTS_PAGE_SIZE = 12;
export const LISTS_PAGE_SIZE_OPTIONS: readonly number[] = [
    3,
    6,
    DEFAULT_LISTS_PAGE_SIZE,
    24,
    48,
    96,
    1000,
];
export const SEARCH_DEBOUNCE_MS = 300;
