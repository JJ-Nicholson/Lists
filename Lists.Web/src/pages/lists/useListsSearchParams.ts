import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
    DEFAULT_LISTS_PAGE_SIZE,
    DEFAULT_PAGE,
    DEFAULT_SORT_DIRECTION,
    SEARCH_DEBOUNCE_MS,
    type SortDirection,
} from "./listsPageConfig";
import {
    getListsPageSize,
    getPositiveInteger,
    getSortDirection,
} from "./listsPageQuery";

type ListsSearchParamKey = "page" | "pageSize" | "search" | "sortDirection";
type ListsSearchParamValue = string | number | null | undefined;
type ListsSearchParamUpdates = Partial<
    Record<ListsSearchParamKey, ListsSearchParamValue>
>;

type UpdateListSearchParamsOptions = {
    resetPage?: boolean;
    replace?: boolean;
};

export type UpdateListSearchParams = (
    nextValues: ListsSearchParamUpdates,
    options?: UpdateListSearchParamsOptions,
) => void;

type UseListsSearchParamsResult = {
    page: number;
    pageSize: number;
    search: string;
    searchInput: string;
    sortDirection: SortDirection;
    updateListSearchParams: UpdateListSearchParams;
    handlePageChange: (nextPage: number) => void;
    handlePageSizeChange: (nextPageSize: number) => void;
    handleSearchChange: (value: string) => void;
    handleSortDirectionChange: (value: string) => void;
};

export function useListsSearchParams(): UseListsSearchParamsResult {
    const [searchParams, setSearchParams] = useSearchParams();
    const page = getPositiveInteger(searchParams.get("page"), DEFAULT_PAGE);
    const pageSize = getListsPageSize(searchParams.get("pageSize"));
    const search = searchParams.get("search") ?? "";
    const sortDirection = getSortDirection(searchParams.get("sortDirection"));
    const [searchInput, setSearchInput] = useState(search);
    const pendingSearchParamRef = useRef<string | null>(null);

    const debouncedSearch = useDebouncedValue(
        searchInput,
        SEARCH_DEBOUNCE_MS,
    );

    useEffect(() => {
        if (pendingSearchParamRef.current === search) {
            pendingSearchParamRef.current = null;
            return;
        }

        setSearchInput(search);
    }, [search]);

    const updateListSearchParams = useCallback<UpdateListSearchParams>((
        nextValues,
        options = {},
    ) => {
        const { resetPage = true, replace = false } = options;

        setSearchParams(
            (currentParams) => {
                const nextParams = new URLSearchParams(currentParams);

                Object.entries(nextValues).forEach(([key, value]) => {
                    const shouldPreserveWhitespace = key === "search";
                    const nextValue =
                        typeof value === "string" && !shouldPreserveWhitespace
                            ? value.trim()
                            : value;

                    if (
                        nextValue === undefined ||
                        nextValue === null ||
                        nextValue === ""
                    ) {
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

                    if (key === "page" && Number(nextValue) === DEFAULT_PAGE) {
                        nextParams.delete(key);
                        return;
                    }

                    if (
                        key === "pageSize" &&
                        Number(nextValue) === DEFAULT_LISTS_PAGE_SIZE
                    ) {
                        nextParams.delete(key);
                        return;
                    }

                    nextParams.set(key, String(nextValue));
                });

                if (resetPage) {
                    nextParams.delete("page");
                }

                return nextParams;
            },
            {
                preventScrollReset: true,
                replace,
            },
        );
    }, [setSearchParams]);

    function handleSearchChange(value: string): void {
        setSearchInput(value);
    }

    useEffect(() => {
        if (debouncedSearch !== searchInput) {
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

    function handleSortDirectionChange(value: string): void {
        updateListSearchParams({
            sortDirection: getSortDirection(value),
        });
    }

    function handlePageChange(nextPage: number): void {
        updateListSearchParams(
            { page: nextPage },
            { resetPage: false },
        );
    }

    function handlePageSizeChange(nextPageSize: number): void {
        updateListSearchParams({ pageSize: nextPageSize });
    }

    return {
        page,
        pageSize,
        search,
        searchInput,
        sortDirection,
        updateListSearchParams,
        handlePageChange,
        handlePageSizeChange,
        handleSearchChange,
        handleSortDirectionChange,
    };
}
