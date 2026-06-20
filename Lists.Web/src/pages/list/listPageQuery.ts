import {
    DEFAULT_ITEM_SORT,
    DEFAULT_ITEM_STATUS,
    DEFAULT_SORT_DIRECTION,
    type ItemSort,
    type ItemStatus,
    type SortDirection,
} from "./listPageConfig";

const ITEM_STATUSES = ["all", "active", "completed"] as const;
const ITEM_SORTS = ["name", "amount", "status"] as const;

export function getItemStatus(value: string | null): ItemStatus {
    return ITEM_STATUSES.includes(value as ItemStatus)
        ? (value as ItemStatus)
        : DEFAULT_ITEM_STATUS;
}

export function getItemSortBy(value: string | null): ItemSort {
    return ITEM_SORTS.includes(value as ItemSort)
        ? (value as ItemSort)
        : DEFAULT_ITEM_SORT;
}

export function getSortDirection(value: string | null): SortDirection {
    return value === "desc" ? "desc" : DEFAULT_SORT_DIRECTION;
}
