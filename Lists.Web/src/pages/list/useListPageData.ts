import { useEffect, useRef, useState } from "react";

import {
    getListLoadErrorMessage,
    isListNotFoundError,
} from "../../api/errorMessages";
import { getListDetails, type ListDetails } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { ItemSort, ItemStatus, SortDirection } from "./listPageConfig";

type UseListPageDataParams = {
    listId: string;
    search: string;
    status: ItemStatus;
    sortBy: ItemSort;
    sortDirection: SortDirection;
};

type UseListPageDataResult = {
    error: string;
    isListNotFound: boolean;
    isLoading: boolean;
    items: ListDetails["items"];
    list: ListDetails | null;
    refreshListPage: () => Promise<ListDetails | null>;
    totalAmount: number;
};

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

export function useListPageData({
    listId,
    search,
    status,
    sortBy,
    sortDirection,
}: UseListPageDataParams): UseListPageDataResult {
    const getAccessToken = useAccessToken();
    const [isLoading, setIsLoading] = useState(true);
    const [isListNotFound, setIsListNotFound] = useState(false);
    const [error, setError] = useState("");
    const [listDetails, setListDetails] = useState<ListDetails | null>(null);
    const requestControllerRef = useRef<AbortController | null>(null);

    const items = listDetails?.items ?? [];
    const totalAmount = listDetails?.totalAmount ?? 0;

    useEffect(() => {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;

        async function loadListDetails(): Promise<void> {
            setIsLoading(true);
            setError("");

            try {
                const accessToken = await getAccessToken();
                const loadedListDetails = await getListDetails(
                    listId,
                    { search, status, sortBy, sortDirection },
                    { accessToken, signal: controller.signal },
                );

                if (requestControllerRef.current === controller) {
                    setListDetails(loadedListDetails);
                }
            } catch (error) {
                if (
                    requestControllerRef.current !== controller ||
                    controller.signal.aborted ||
                    isAbortError(error)
                ) {
                    return;
                }

                if (isListNotFoundError(error)) {
                    setIsListNotFound(true);
                    return;
                }

                setError(getListLoadErrorMessage(error, "Could not load list."));
            } finally {
                if (requestControllerRef.current === controller) {
                    requestControllerRef.current = null;
                    setIsLoading(false);
                }
            }
        }

        loadListDetails();

        return () => {
            requestControllerRef.current?.abort();
            requestControllerRef.current = null;
        };
    }, [getAccessToken, listId, search, status, sortBy, sortDirection]);

    async function refreshListPage(): Promise<ListDetails | null> {
        requestControllerRef.current?.abort();

        const controller = new AbortController();
        requestControllerRef.current = controller;
        setIsLoading(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            const updatedListDetails = await getListDetails(
                listId,
                { search, status, sortBy, sortDirection },
                { accessToken, signal: controller.signal },
            );

            if (requestControllerRef.current !== controller) {
                return null;
            }

            setListDetails(updatedListDetails);
            return updatedListDetails;
        } catch (refreshError) {
            if (
                requestControllerRef.current !== controller ||
                controller.signal.aborted ||
                isAbortError(refreshError)
            ) {
                return null;
            }

            if (isListNotFoundError(refreshError)) {
                setIsListNotFound(true);
            } else {
                setError(
                    getListLoadErrorMessage(
                        refreshError,
                        "Could not refresh list.",
                    ),
                );
            }
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
        isListNotFound,
        isLoading,
        items,
        list: listDetails,
        refreshListPage,
        totalAmount,
    };
}
