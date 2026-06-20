import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../../api/client";
import { getListsPage, type ListsPage } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { SortDirection } from "./listsPageConfig";
import { getListsQueryParams } from "./listsPageQuery";
import type { UpdateListsSearchParams } from "./useListsSearchParams";

type UseListsPageDataParams = {
    page: number;
    pageSize: number;
    search: string;
    sortDirection: SortDirection;
    updateListsSearchParams: UpdateListsSearchParams;
};

type UseListsPageDataResult = {
    error: string;
    hasLoadedLists: boolean;
    isLoading: boolean;
    lists: ListsPage["lists"];
    pageInfo: ListsPage["page"] | undefined;
    refreshListsPage: () => Promise<ListsPage | null>;
};

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

export function useListsPageData({
    page,
    pageSize,
    search,
    sortDirection,
    updateListsSearchParams,
}: UseListsPageDataParams): UseListsPageDataResult {
    const getAccessToken = useAccessToken();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [listsPage, setListsPage] = useState<ListsPage | null>(null);
    const requestControllerRef = useRef<AbortController | null>(null);

    const hasLoadedLists = listsPage !== null;
    const lists = listsPage?.lists ?? [];
    const pageInfo = listsPage?.page;

    const applyListsPage = useCallback((loadedListsPage: ListsPage): void => {
        setListsPage(loadedListsPage);

        if (loadedListsPage.page.page !== page) {
            updateListsSearchParams(
                { page: loadedListsPage.page.page },
                { resetPage: false, replace: true },
            );
        }
    }, [page, updateListsSearchParams]);

    useEffect(() => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

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

                if (requestControllerRef.current === controller) {
                    applyListsPage(loadedListsPage);
                }
            } catch (loadError) {
                if (
                    requestControllerRef.current !== controller ||
                    controller.signal.aborted ||
                    isAbortError(loadError)
                ) {
                    return;
                }

                if (loadError instanceof ApiError && loadError.status === 400) {
                    setError(loadError.message);
                    return;
                }

                setError("Could not load lists.");
            } finally {
                if (requestControllerRef.current === controller) {
                    requestControllerRef.current = null;
                    setIsLoading(false);
                }
            }
        }

        loadLists();

        return () => {
            requestControllerRef.current?.abort();
            requestControllerRef.current = null;
        };
    }, [applyListsPage, getAccessToken, page, pageSize, search, sortDirection]);

    async function refreshListsPage(): Promise<ListsPage | null> {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;
        setIsLoading(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            const updatedListsPage = await getListsPage(
                getListsQueryParams({ page, pageSize, search, sortDirection }),
                { accessToken, signal: controller.signal },
            );

            if (requestControllerRef.current !== controller) {
                return null;
            }

            applyListsPage(updatedListsPage);
            return updatedListsPage;
        } catch (refreshError) {
            if (
                requestControllerRef.current !== controller ||
                controller.signal.aborted ||
                isAbortError(refreshError)
            ) {
                return null;
            }

            if (refreshError instanceof ApiError && refreshError.status === 400) {
                setError(refreshError.message);
                return null;
            }

            setError("Could not refresh lists.");
            return null;
        } finally {
            if (requestControllerRef.current === controller) {
                requestControllerRef.current = null;
                setIsLoading(false);
            }
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
