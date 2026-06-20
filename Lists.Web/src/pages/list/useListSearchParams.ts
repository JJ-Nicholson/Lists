import { useCallback, useEffect, useRef, useState } from "react";
import {
    useLocation,
    useNavigationType,
    useSearchParams,
} from "react-router";

import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
    DEFAULT_ITEM_SORT,
    DEFAULT_ITEM_STATUS,
    DEFAULT_SORT_DIRECTION,
    SEARCH_DEBOUNCE_MS,
    type ItemSort,
    type ItemStatus,
    type SortDirection,
} from "./listPageConfig";
import {
    getItemSortBy,
    getItemStatus,
    getSortDirection,
} from "./listPageQuery";

type ListSearchParamKey = "search" | "status" | "sortBy" | "sortDirection";
type ListSearchParamValue = string | null | undefined;
type ListSearchParamUpdates = Partial<
    Record<ListSearchParamKey, ListSearchParamValue>
>;

type UpdateListSearchParamsOptions = {
    replace?: boolean;
};

type UpdateListSearchParams = (
    nextValues: ListSearchParamUpdates,
    options?: UpdateListSearchParamsOptions,
) => void;

type UseListSearchParamsResult = {
    search: string;
    searchInput: string;
    status: ItemStatus;
    sortBy: ItemSort;
    sortDirection: SortDirection;
    handleSearchChange: (value: string) => void;
    handleStatusChange: (value: string) => void;
    handleSortByChange: (value: string) => void;
    handleSortDirectionChange: (value: string) => void;
};

export function useListSearchParams(): UseListSearchParamsResult {
    const location = useLocation();
    const navigationType = useNavigationType();
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") ?? "";
    const status = getItemStatus(searchParams.get("status"));
    const sortBy = getItemSortBy(searchParams.get("sortBy"));
    const sortDirection = getSortDirection(searchParams.get("sortDirection"));
    const [searchInput, setSearchInput] = useState(search);
    const pendingSearchParamRef = useRef<string | null>(null);
    const previousSearchParamRef = useRef(search);

    const debouncedSearch = useDebouncedValue(
        searchInput,
        SEARCH_DEBOUNCE_MS,
    );

    useEffect(() => {
        const searchChanged = previousSearchParamRef.current !== search;
        previousSearchParamRef.current = search;

        if (!searchChanged && navigationType !== "POP") {
            return;
        }

        if (pendingSearchParamRef.current === search) {
            pendingSearchParamRef.current = null;
            return;
        }

        pendingSearchParamRef.current = search;
        setSearchInput(search);
    }, [location.key, navigationType, search]);

    const updateListSearchParams = useCallback<UpdateListSearchParams>(
        (nextValues, options = {}) => {
            const { replace = false } = options;

            setSearchParams(
                (currentParams) => {
                    const nextParams = new URLSearchParams(currentParams);

                    Object.entries(nextValues).forEach(([key, value]) => {
                        const shouldPreserveWhitespace = key === "search";
                        const nextValue =
                            typeof value === "string" && !shouldPreserveWhitespace
                                ? value.trim()
                                : value;

                        if (!nextValue) {
                            nextParams.delete(key);
                            return;
                        }

                        if (key === "status" && nextValue === DEFAULT_ITEM_STATUS) {
                            nextParams.delete(key);
                            return;
                        }

                        if (key === "sortBy" && nextValue === DEFAULT_ITEM_SORT) {
                            nextParams.delete(key);
                            return;
                        }

                        if (
                            key === "sortDirection" &&
                            nextValue === DEFAULT_SORT_DIRECTION
                        ) {
                            nextParams.delete(key);
                            return;
                        }

                        nextParams.set(key, String(nextValue));
                    });

                    return nextParams;
                },
                {
                    preventScrollReset: true,
                    replace,
                },
            );
        },
        [setSearchParams],
    );

    function handleSearchChange(value: string): void {
        pendingSearchParamRef.current = value;
        setSearchInput(value);
    }

    useEffect(() => {
        if (
            debouncedSearch !== searchInput ||
            pendingSearchParamRef.current !== debouncedSearch
        ) {
            return;
        }

        if (debouncedSearch === search) {
            return;
        }

        pendingSearchParamRef.current = debouncedSearch;
        updateListSearchParams(
            { search: debouncedSearch },
            { replace: true },
        );
    }, [debouncedSearch, search, searchInput, updateListSearchParams]);

    function handleStatusChange(value: string): void {
        updateListSearchParams({
            status: getItemStatus(value),
        });
    }

    function handleSortByChange(value: string): void {
        updateListSearchParams({
            sortBy: getItemSortBy(value),
        });
    }

    function handleSortDirectionChange(value: string): void {
        updateListSearchParams({
            sortDirection: getSortDirection(value),
        });
    }

    return {
        search,
        searchInput,
        status,
        sortBy,
        sortDirection,
        handleSearchChange,
        handleStatusChange,
        handleSortByChange,
        handleSortDirectionChange,
    };
}
