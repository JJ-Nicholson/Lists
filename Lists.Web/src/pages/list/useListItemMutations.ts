import { useCallback, useState } from "react";

import {
    getBulkItemsActionErrorMessage,
    getItemActionErrorMessage,
    isListNotFoundError,
} from "../../api/errorMessages";
import {
    markListItemsComplete,
    markListItemsIncomplete,
    updateListItem,
    type ListItem,
} from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";

type UseListItemMutationsParams = {
    items: ListItem[];
    listId: string;
    onListNotFound: () => void;
    refreshListPage: () => Promise<unknown>;
};

type UseListItemMutationsResult = {
    clearMutationError: () => void;
    isMutatingItems: boolean;
    mutationError: string;
    handleItemCompletedChange: (itemId: number) => Promise<void>;
    handleMarkAllItemsComplete: () => Promise<void>;
    handleMarkAllItemsIncomplete: () => Promise<void>;
};

export function useListItemMutations({
    items,
    listId,
    onListNotFound,
    refreshListPage,
}: UseListItemMutationsParams): UseListItemMutationsResult {
    const getAccessToken = useAccessToken();
    const [isMutatingItems, setIsMutatingItems] = useState(false);
    const [mutationError, setMutationError] = useState("");

    const clearMutationError = useCallback((): void => {
        setMutationError("");
    }, []);

    async function handleItemCompletedChange(itemId: number): Promise<void> {
        const item = items.find((item) => item.id === itemId);

        if (!item) {
            return;
        }

        setIsMutatingItems(true);
        setMutationError("");

        try {
            const accessToken = await getAccessToken();
            await updateListItem(
                listId,
                item.id,
                {
                    name: item.name,
                    amount: item.amount,
                    isCompleted: !item.isCompleted,
                    version: item.version,
                },
                { accessToken },
            );
            await refreshListPage();
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setMutationError(
                getItemActionErrorMessage(error, "Could not update list entry."),
            );
        } finally {
            setIsMutatingItems(false);
        }
    }

    async function handleMarkAllItemsComplete(): Promise<void> {
        const itemsToMarkComplete = items
            .filter((item) => !item.isCompleted)
            .map((item) => ({ id: item.id, version: item.version }));

        if (itemsToMarkComplete.length === 0) {
            return;
        }

        setIsMutatingItems(true);
        setMutationError("");

        try {
            const accessToken = await getAccessToken();
            await markListItemsComplete(
                listId,
                itemsToMarkComplete,
                { accessToken },
            );
            await refreshListPage();
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setMutationError(
                getBulkItemsActionErrorMessage(
                    error,
                    "Could not mark list entries complete.",
                ),
            );
        } finally {
            setIsMutatingItems(false);
        }
    }

    async function handleMarkAllItemsIncomplete(): Promise<void> {
        const itemsToMarkIncomplete = items
            .filter((item) => item.isCompleted)
            .map((item) => ({ id: item.id, version: item.version }));

        if (itemsToMarkIncomplete.length === 0) {
            return;
        }

        setIsMutatingItems(true);
        setMutationError("");

        try {
            const accessToken = await getAccessToken();
            await markListItemsIncomplete(
                listId,
                itemsToMarkIncomplete,
                { accessToken },
            );
            await refreshListPage();
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setMutationError(
                getBulkItemsActionErrorMessage(
                    error,
                    "Could not mark list entries incomplete.",
                ),
            );
        } finally {
            setIsMutatingItems(false);
        }
    }

    return {
        clearMutationError,
        isMutatingItems,
        mutationError,
        handleItemCompletedChange,
        handleMarkAllItemsComplete,
        handleMarkAllItemsIncomplete,
    };
}
