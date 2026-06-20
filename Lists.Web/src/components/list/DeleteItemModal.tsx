import type { SubmitEvent } from "react";
import { useState } from "react";

import {
    getItemActionErrorMessage,
    isItemReloadableError,
    isListNotFoundError,
} from "../../api/errorMessages";
import { deleteListItem, type ListItem } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { MaybePromise } from "../callbackTypes";
import { Button } from "../Button";
import Modal from "../Modal";

type DeleteItemModalProps = {
    item: ListItem;
    listId: string;
    onClose: () => void;
    onItemDeleted: () => MaybePromise<unknown>;
    onListNotFound: () => void;
    onReloadItem: (item: ListItem) => MaybePromise<unknown>;
};

export default function DeleteItemModal({
    item,
    listId,
    onClose,
    onItemDeleted,
    onListNotFound,
    onReloadItem,
}: DeleteItemModalProps) {
    const getAccessToken = useAccessToken();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");
    const [canReloadItem, setCanReloadItem] = useState(false);

    function closeDeleteModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleDeleteItem(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await deleteListItem(listId, item.id, item.version, { accessToken });
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setModalError(
                getItemActionErrorMessage(error, "Could not delete list entry."),
            );
            setCanReloadItem(isItemReloadableError(error));
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onItemDeleted();
    }

    async function handleReloadItem(): Promise<void> {
        setIsSubmitting(true);
        setModalError("");

        try {
            await onReloadItem(item);
            setIsSubmitting(false);
        } catch {
            setModalError("Could not reload list entry.");
            setCanReloadItem(true);
            setIsSubmitting(false);
        }
    }

    return (
        <Modal
            actions={
                canReloadItem ? (
                    <Button disabled={isSubmitting} onClick={handleReloadItem}>
                        {isSubmitting ? "Reloading List..." : "Reload List"}
                    </Button>
                ) : (
                    <Button
                        disabled={isSubmitting}
                        form="delete-item-form"
                        type="submit"
                        variant="danger"
                    >
                        {isSubmitting ? "Deleting..." : "Delete"}
                    </Button>
                )
            }
            className="delete-item-modal"
            isOpen
            onClose={isSubmitting ? undefined : closeDeleteModal}
            title="Delete Entry"
        >
            <form
                className="modal-form"
                id="delete-item-form"
                onSubmit={handleDeleteItem}
            >
                <p>
                    Are you sure you want to permanently delete{" "}
                    <strong>{item.name}</strong> from this list?
                </p>
                <span>This action cannot be undone.</span>

                {modalError && (
                    <p className="modal-form__error" role="alert">
                        {modalError}
                    </p>
                )}
            </form>
        </Modal>
    );
}
