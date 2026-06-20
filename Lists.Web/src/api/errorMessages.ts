import { ApiError } from "./client";

const RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE =
    "Reload the list to see what changed before making further changes.";
const RELOAD_TO_REVIEW_CHANGES_MESSAGE =
    "Reload to see what changed before making further changes.";
const LIST_UNAVAILABLE_MESSAGE =
    "This list does not exist, was deleted, or you no longer have access.";
const ITEM_DELETED_MESSAGE =
    "This entry may have been deleted since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const ITEM_MODIFIED_MESSAGE =
    "This entry has been modified since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const BULK_ITEMS_MODIFIED_MESSAGE =
    "One or more entries have been modified since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const BULK_ITEMS_DELETED_MESSAGE =
    "One or more entries may have been deleted since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const BULK_ITEMS_ALREADY_COMPLETED_MESSAGE =
    "One or more entries have already been completed since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const BULK_ITEMS_ALREADY_INCOMPLETE_MESSAGE =
    "One or more entries have already been marked incomplete since you last checked. " +
    RELOAD_LIST_TO_REVIEW_CHANGES_MESSAGE;
const LIST_MODIFIED_MESSAGE =
    "This list has been modified since you last checked. " +
    RELOAD_TO_REVIEW_CHANGES_MESSAGE;

function hasMessage(error: ApiError, message: string): boolean {
    return error.message.trim().toLowerCase() === message.toLowerCase();
}

function isApiErrorWithStatus(
    error: unknown,
    status: number,
): error is ApiError {
    return error instanceof ApiError && error.status === status;
}

function isApiErrorWithMessage(
    error: unknown,
    status: number,
    message: string,
): error is ApiError {
    return isApiErrorWithStatus(error, status) && hasMessage(error, message);
}

export function isListNotFoundError(error: unknown): boolean {
    return isApiErrorWithMessage(error, 404, "List not found.");
}

function isListModifiedError(error: unknown): boolean {
    return isApiErrorWithMessage(
        error,
        409,
        "List was modified. Reload and try again.",
    );
}

function isItemNotFoundError(error: unknown): boolean {
    return isApiErrorWithMessage(error, 404, "Item not found.");
}

function isItemModifiedError(error: unknown): boolean {
    return isApiErrorWithMessage(
        error,
        409,
        "Item was modified. Reload and try again.",
    );
}

function isBulkItemsNotFoundError(error: unknown): boolean {
    return isApiErrorWithMessage(error, 404, "One or more items not found.");
}

function isBulkItemsModifiedError(error: unknown): boolean {
    return isApiErrorWithMessage(
        error,
        409,
        "One or more items were modified. Reload and try again.",
    );
}

function isBulkItemsAlreadyCompleteError(error: unknown): boolean {
    return isApiErrorWithMessage(
        error,
        409,
        "One or more items are already complete. Reload and try again.",
    );
}

function isBulkItemsAlreadyIncompleteError(error: unknown): boolean {
    return isApiErrorWithMessage(
        error,
        409,
        "One or more items are already incomplete. Reload and try again.",
    );
}

export function isListReloadableError(error: unknown): boolean {
    return isListNotFoundError(error) || isListModifiedError(error);
}

export function isItemReloadableError(error: unknown): boolean {
    return isItemNotFoundError(error) || isItemModifiedError(error);
}

export function getListLoadErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    if (!(error instanceof ApiError)) {
        return fallbackMessage;
    }

    if (isApiErrorWithStatus(error, 400)) {
        return error.message;
    }

    return fallbackMessage;
}

export function getListActionErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    if (!(error instanceof ApiError)) {
        return fallbackMessage;
    }

    if (isListNotFoundError(error)) {
        return LIST_UNAVAILABLE_MESSAGE;
    }

    if (isListModifiedError(error)) {
        return LIST_MODIFIED_MESSAGE;
    }

    return error.message;
}

export function getItemActionErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    if (!(error instanceof ApiError)) {
        return fallbackMessage;
    }

    if (isListNotFoundError(error)) {
        return LIST_UNAVAILABLE_MESSAGE;
    }

    if (isItemNotFoundError(error)) {
        return ITEM_DELETED_MESSAGE;
    }

    if (isItemModifiedError(error)) {
        return ITEM_MODIFIED_MESSAGE;
    }

    return error.message;
}

export function getBulkItemsActionErrorMessage(
    error: unknown,
    fallbackMessage: string,
): string {
    if (!(error instanceof ApiError)) {
        return fallbackMessage;
    }

    if (isListNotFoundError(error)) {
        return LIST_UNAVAILABLE_MESSAGE;
    }

    if (isBulkItemsNotFoundError(error)) {
        return BULK_ITEMS_DELETED_MESSAGE;
    }

    if (isBulkItemsModifiedError(error)) {
        return BULK_ITEMS_MODIFIED_MESSAGE;
    }

    if (isBulkItemsAlreadyCompleteError(error)) {
        return BULK_ITEMS_ALREADY_COMPLETED_MESSAGE;
    }

    if (isBulkItemsAlreadyIncompleteError(error)) {
        return BULK_ITEMS_ALREADY_INCOMPLETE_MESSAGE;
    }

    return error.message;
}
