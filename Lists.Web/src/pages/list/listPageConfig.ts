export const DEFAULT_SORT_DIRECTION = "asc";
export type SortDirection = typeof DEFAULT_SORT_DIRECTION | "desc";

export const DEFAULT_ITEM_STATUS = "all";
export type ItemStatus = typeof DEFAULT_ITEM_STATUS | "active" | "completed";

export const DEFAULT_ITEM_SORT = "name";
export type ItemSort = typeof DEFAULT_ITEM_SORT | "amount" | "status";

export const SEARCH_DEBOUNCE_MS = 300;
