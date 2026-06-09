import type { SubmitEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../../api/client";
import {
    getListAccess,
    grantListAccess,
    revokeListAccess,
    type ListAccessEntry,
    type ListSummary,
} from "../../api/lists";
import {
    canManageListAccess,
    LIST_ROLES,
    normaliseListRole,
} from "../../access/permissions";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import Modal from "../Modal";

type ReviewListAccessModalProps = {
    list: ListSummary;
    onClose: () => void;
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof ApiError ? error.message : fallbackMessage;
}

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

function sortAccessEntries(
    accessEntries: readonly ListAccessEntry[],
): ListAccessEntry[] {
    return [...accessEntries].sort((firstEntry, secondEntry) => {
        const firstIsOwner =
            normaliseListRole(firstEntry.role) === LIST_ROLES.OWNER;
        const secondIsOwner =
            normaliseListRole(secondEntry.role) === LIST_ROLES.OWNER;

        if (firstIsOwner !== secondIsOwner) {
            return firstIsOwner ? -1 : 1;
        }

        return firstEntry.username.localeCompare(secondEntry.username);
    });
}

export default function ReviewListAccessModal({
    list,
    onClose,
}: ReviewListAccessModalProps) {
    const getAccessToken = useAccessToken();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [accessEntries, setAccessEntries] = useState<ListAccessEntry[]>([]);
    const [username, setUsername] = useState("");
    const [revokingUsername, setRevokingUsername] = useState("");
    const [isGranting, setIsGranting] = useState(false);

    const isMountedRef = useRef(true);
    const loadControllerRef = useRef<AbortController | null>(null);

    const canManageAccess = canManageListAccess(list.currentUserRole);
    const isBusy = isGranting || Boolean(revokingUsername);
    const usernameId = "grant-list-access-username";

    const loadAccessEntries = useCallback(async (): Promise<void> => {
        if (!isMountedRef.current) {
            return;
        }

        loadControllerRef.current?.abort();

        const controller = new AbortController();
        const { signal } = controller;

        loadControllerRef.current = controller;
        setIsLoading(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            const loadedAccessEntries = await getListAccess(list.id, {
                accessToken,
                signal,
            });

            if (!signal.aborted && isMountedRef.current) {
                setAccessEntries(sortAccessEntries(loadedAccessEntries));
            }
        } catch (loadError) {
            if (isAbortError(loadError)) {
                return;
            }

            if (isMountedRef.current) {
                setError(
                    getErrorMessage(loadError, "Could not load list access."),
                );
            }
        } finally {
            if (!signal.aborted && isMountedRef.current) {
                setIsLoading(false);
            }

            if (loadControllerRef.current === controller) {
                loadControllerRef.current = null;
            }
        }
    }, [getAccessToken, list.id]);

    useEffect(() => {
        isMountedRef.current = true;

        const timeoutId = window.setTimeout(() => {
            loadAccessEntries();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
            isMountedRef.current = false;
            loadControllerRef.current?.abort();
            loadControllerRef.current = null;
        };
    }, [loadAccessEntries]);

    function closeModal(): void {
        if (isBusy) {
            return;
        }

        onClose();
    }

    async function handleGrantAccess(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError("Enter a username.");
            return;
        }

        setIsGranting(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            await grantListAccess(list.id, trimmedUsername, { accessToken });
            if (!isMountedRef.current) {
                return;
            }

            setUsername("");
            await loadAccessEntries();
        } catch (grantError) {
            if (isMountedRef.current) {
                setError(
                    getErrorMessage(grantError, "Could not grant list access."),
                );
            }
        } finally {
            if (isMountedRef.current) {
                setIsGranting(false);
            }
        }
    }

    async function handleRevokeAccess(targetUsername: string): Promise<void> {
        setRevokingUsername(targetUsername);
        setError("");

        try {
            const accessToken = await getAccessToken();
            await revokeListAccess(list.id, targetUsername, { accessToken });
            if (!isMountedRef.current) {
                return;
            }

            await loadAccessEntries();
        } catch (revokeError) {
            if (isMountedRef.current) {
                setError(
                    getErrorMessage(revokeError, "Could not revoke list access."),
                );
            }
        } finally {
            if (isMountedRef.current) {
                setRevokingUsername("");
            }
        }
    }

    return (
        <Modal
            className="modal__panel--access-review"
            isOpen={true}
            onClose={isBusy ? undefined : closeModal}
            title="Review Access"
        >
            <>
                <p>
                    <strong>{list.name}</strong>
                </p>

                {isLoading && <p>Loading...</p>}

                {error && (
                    <p className="modal-form__error" role="alert">
                        {error}
                    </p>
                )}

                {accessEntries.length > 0 && (
                    <ul className="access-list">
                        {accessEntries.map((accessEntry) => {
                            const isOwner =
                                normaliseListRole(accessEntry.role) ===
                                LIST_ROLES.OWNER;
                            const isRevoking =
                                revokingUsername === accessEntry.username;

                            return (
                                <li
                                    className="card access-list__item"
                                    key={accessEntry.username}
                                >
                                    <div>
                                        <p>
                                            <strong>
                                                {accessEntry.username}
                                            </strong>
                                        </p>
                                        <p className="eyebrow">
                                            {accessEntry.role}
                                        </p>
                                    </div>

                                    {canManageAccess && !isOwner && (
                                        <div className="modal__actions">
                                            <Button
                                                disabled={isBusy}
                                                onClick={() =>
                                                    handleRevokeAccess(
                                                        accessEntry.username,
                                                    )
                                                }
                                                variant="danger"
                                            >
                                                {isRevoking
                                                    ? "Revoking..."
                                                    : "Revoke"}
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {canManageAccess && (
                    <form className="modal-form" onSubmit={handleGrantAccess}>
                        <label
                            className="modal-form__field"
                            htmlFor={usernameId}
                        >
                            <span>Username</span>
                            <input
                                disabled={isBusy}
                                id={usernameId}
                                maxLength={50}
                                minLength={2}
                                onChange={(event) =>
                                    setUsername(event.target.value)
                                }
                                pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                                placeholder="username"
                                required
                                type="text"
                                value={username}
                            />
                        </label>

                        <div className="modal__actions">
                            <Button disabled={isBusy} type="submit">
                                {isGranting ? "Granting..." : "Grant access"}
                            </Button>
                        </div>
                    </form>
                )}
            </>
        </Modal>
    );
}
