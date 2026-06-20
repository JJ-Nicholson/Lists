import { buildApiUrl, buildHeaders, throwIfResponseNotOk } from "./client";

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue>;

type RequestOptions = {
    accessToken?: string | null;
};

type AbortableRequestOptions = RequestOptions & {
    signal?: AbortSignal;
};

type ListId = number | string;
type ItemId = number | string;

export type ListsPageInfo = {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
};

export type ListItem = {
    id: number;
    name: string;
    amount: number;
    isCompleted: boolean;
    version: number;
};

export type ListSummary = {
    id: number;
    name: string;
    unitLabel: string | null;
    version: number;
    itemCount: number;
    completedItemCount: number;
    currentUserRole: string;
    ownerUsername: string;
};

export type ListsPage = {
    lists: ListSummary[];
    page: ListsPageInfo;
};

export type List = {
    id: number;
    name: string;
    unitLabel: string | null;
    version: number;
    items: ListItem[];
};

export type ListDetails = {
    id: number;
    name: string;
    unitLabel: string | null;
    version: number;
    items: ListItem[];
    totalAmount: number;
};

export type ListAccessEntry = {
    username: string;
    role: string;
};

export type CreateListRequest = {
    name: string;
    unitLabel?: string | null;
};

export type UpdateListRequest = {
    name: string;
    unitLabel: string | null;
    version: number;
};

export type CreateListItemRequest = {
    name: string;
    amount: number;
};

export type UpdateListItemRequest = {
    name: string;
    amount: number;
    isCompleted: boolean;
    version: number;
};

export type BulkUpdateListItem = {
    id: number;
    version: number;
};

export async function getListsPage(
    queryParams: QueryParams = {},
    { accessToken, signal }: AbortableRequestOptions = {},
): Promise<ListsPage> {
    const response = await fetch(buildApiUrl("/lists", queryParams), {
        headers: buildHeaders(accessToken),
        signal,
    });

    await throwIfResponseNotOk(response, "Failed to load lists.");

    return response.json();
}

export async function createList(
    list: CreateListRequest,
    { accessToken }: RequestOptions = {},
): Promise<List> {
    const response = await fetch(buildApiUrl("/lists"), {
        method: "POST",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(list),
    });

    await throwIfResponseNotOk(response, "Failed to create list.");

    return response.json();
}

export async function getListDetails(
    listId: ListId,
    queryParams: QueryParams = {},
    { accessToken, signal }: AbortableRequestOptions = {},
): Promise<ListDetails> {
    const response = await fetch(buildApiUrl(`/lists/${listId}`, queryParams), {
        headers: buildHeaders(accessToken),
        signal,
    });

    await throwIfResponseNotOk(response, "Failed to load list.");

    return response.json();
}

export async function updateList(
    listId: ListId,
    list: UpdateListRequest,
    { accessToken }: RequestOptions = {},
): Promise<List> {
    const response = await fetch(buildApiUrl(`/lists/${listId}`), {
        method: "PATCH",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(list),
    });

    await throwIfResponseNotOk(response, "Failed to update list.");

    return response.json();
}

export async function deleteList(
    listId: ListId,
    version: number,
    { accessToken }: RequestOptions = {},
): Promise<void> {
    const response = await fetch(buildApiUrl(`/lists/${listId}`, { version }), {
        method: "DELETE",
        headers: buildHeaders(accessToken),
    });

    await throwIfResponseNotOk(response, "Failed to delete list.");
}

export async function createListItem(
    listId: ListId,
    item: CreateListItemRequest,
    { accessToken }: RequestOptions = {},
): Promise<void> {
    const response = await fetch(buildApiUrl(`/lists/${listId}/items`), {
        method: "POST",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(item),
    });

    await throwIfResponseNotOk(response, "Failed to create list entry.");
}

export async function updateListItem(
    listId: ListId,
    itemId: ItemId,
    item: UpdateListItemRequest,
    { accessToken }: RequestOptions = {},
): Promise<ListItem> {
    const response = await fetch(buildApiUrl(`/lists/${listId}/items/${itemId}`), {
        method: "PATCH",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify(item),
    });

    await throwIfResponseNotOk(response, "Failed to update list entry.");

    return response.json();
}

export async function deleteListItem(
    listId: ListId,
    itemId: ItemId,
    version: number,
    { accessToken }: RequestOptions = {},
): Promise<void> {
    const response = await fetch(
        buildApiUrl(`/lists/${listId}/items/${itemId}`, { version }),
        {
            method: "DELETE",
            headers: buildHeaders(accessToken),
        },
    );

    await throwIfResponseNotOk(response, "Failed to delete list entry.");
}

export async function markListItemsComplete(
    listId: ListId,
    items: readonly BulkUpdateListItem[],
    { accessToken }: RequestOptions = {},
): Promise<ListItem[]> {
    const response = await fetch(
        buildApiUrl(`/lists/${listId}/items/mark-complete`),
        {
            method: "PATCH",
            headers: buildHeaders(accessToken, {
                "Content-Type": "application/json",
            }),
            body: JSON.stringify({ items }),
        },
    );

    await throwIfResponseNotOk(response, "Failed to mark list entries complete.");

    return response.json();
}

export async function markListItemsIncomplete(
    listId: ListId,
    items: readonly BulkUpdateListItem[],
    { accessToken }: RequestOptions = {},
): Promise<ListItem[]> {
    const response = await fetch(
        buildApiUrl(`/lists/${listId}/items/mark-incomplete`),
        {
            method: "PATCH",
            headers: buildHeaders(accessToken, {
                "Content-Type": "application/json",
            }),
            body: JSON.stringify({ items }),
        },
    );

    await throwIfResponseNotOk(response, "Failed to mark list entries incomplete.");

    return response.json();
}

export async function getListAccess(
    listId: ListId,
    { accessToken, signal }: AbortableRequestOptions = {},
): Promise<ListAccessEntry[]> {
    const response = await fetch(buildApiUrl(`/lists/${listId}/access`), {
        headers: buildHeaders(accessToken),
        signal,
    });

    await throwIfResponseNotOk(response, "Failed to load list access.");

    return response.json();
}

export async function grantListAccess(
    listId: ListId,
    username: string,
    { accessToken }: RequestOptions = {},
): Promise<void> {
    const response = await fetch(buildApiUrl(`/lists/${listId}/access`), {
        method: "POST",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({ username }),
    });

    await throwIfResponseNotOk(response, "Failed to grant list access.");
}

export async function revokeListAccess(
    listId: ListId,
    username: string,
    { accessToken }: RequestOptions = {},
): Promise<void> {
    const encodedUsername = encodeURIComponent(username);
    const response = await fetch(
        buildApiUrl(`/lists/${listId}/access/${encodedUsername}`),
        {
            method: "DELETE",
            headers: buildHeaders(accessToken),
        },
    );

    await throwIfResponseNotOk(response, "Failed to revoke list access.");
}
