import { buildApiUrl, buildHeaders, throwIfResponseNotOk } from "./client";

export type User = {
    username: string | null;
    needsUsername: boolean;
};

type GetCurrentUserOptions = {
    accessToken?: string | null;
    signal?: AbortSignal;
};

export async function getCurrentUser({
    accessToken,
    signal,
}: GetCurrentUserOptions = {}): Promise<User> {
    const response = await fetch(buildApiUrl("/user"), {
        headers: buildHeaders(accessToken),
        signal,
    });

    await throwIfResponseNotOk(response, "Failed to load user.");

    return response.json();
}

export async function updateCurrentUser(
    username: string,
    accessToken?: string | null,
): Promise<User> {
    const response = await fetch(buildApiUrl("/user"), {
        method: "PATCH",
        headers: buildHeaders(accessToken, {
            "Content-Type": "application/json",
        }),
        body: JSON.stringify({ username }),
    });

    await throwIfResponseNotOk(response, "Failed to update user.");

    return response.json();
}

export async function deleteCurrentUser(
    accessToken?: string | null,
): Promise<void> {
    const response = await fetch(buildApiUrl("/user"), {
        method: "DELETE",
        headers: buildHeaders(accessToken),
    });

    await throwIfResponseNotOk(response, "Failed to delete user.");
}