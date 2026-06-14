import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../../api/client";
import { getListsPage, type ListsPage } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { SortDirection } from "./listsPageConfig";
import { getListsQueryParams } from "./listsPageQuery";
import type { UpdateListSearchParams } from "./useListsSearchParams";

type UseListsPageDataParams = {
    page: number;
    pageSize: number;
    search: string;
    sortDirection: SortDirection;
    updateListSearchParams: UpdateListSearchParams;
};

type UseListsPageDataResult = {
    error: string;
    hasLoadedLists: boolean;
    isLoading: boolean;
    lists: ListsPage["lists"];
    pageInfo: ListsPage["page"] | undefined;
    refreshListsPage: () => Promise<void>;
};

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

export function useListsPageData({
    page,
    pageSize,
    search,
    sortDirection,
    updateListSearchParams,
}: UseListsPageDataParams): UseListsPageDataResult {
    const getAccessToken = useAccessToken();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [listsPage, setListsPage] = useState<ListsPage | null>(null);

    const hasLoadedLists = listsPage !== null;
    const lists = listsPage?.lists ?? [];
    const pageInfo = listsPage?.page;

    const applyListsPage = useCallback((loadedListsPage: ListsPage): void => {
        setListsPage(loadedListsPage);

        if (loadedListsPage.page.page !== page) {
            updateListSearchParams(
                { page: loadedListsPage.page.page },
                { resetPage: false, replace: true },
            );
        }
    }, [page, updateListSearchParams]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadLists(): Promise<void> {
            setIsLoading(true);
            setError("");

            try {
                const accessToken = await getAccessToken();
                const loadedListsPage = await getListsPage(
                    getListsQueryParams({
                        page,
                        pageSize,
                        search,
                        sortDirection,
                    }),
                    { accessToken, signal: controller.signal },
                );

                if (!controller.signal.aborted) {
                    applyListsPage(loadedListsPage);
                }
            } catch (loadError) {
                if (isAbortError(loadError)) {
                    return;
                }

                if (loadError instanceof ApiError && loadError.status === 400) {
                    setListsPage(null);
                    setError(loadError.message);
                    return;
                }

                setListsPage(null);
                setError("Could not load lists.");
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        loadLists();

        return () => {
            controller.abort();
        };
    }, [applyListsPage, getAccessToken, page, pageSize, search, sortDirection]);

    async function refreshListsPage(): Promise<void> {
        setError("");

        try {
            const accessToken = await getAccessToken();
            const updatedListsPage = await getListsPage(
                getListsQueryParams({ page, pageSize, search, sortDirection }),
                { accessToken },
            );

            applyListsPage(updatedListsPage);
        } catch (refreshError) {
            if (refreshError instanceof ApiError && refreshError.status === 400) {
                setError(refreshError.message);
                return;
            }

            setError("Could not refresh lists.");
        }
    }

    return {
        error,
        hasLoadedLists,
        isLoading,
        lists,
        pageInfo,
        refreshListsPage,
    };
}
