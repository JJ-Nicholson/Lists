import type { SubmitEvent } from "react";
import { useState } from "react";

import {
    getItemActionErrorMessage,
    isItemReloadableError,
    isListNotFoundError,
} from "../../api/errorMessages";
import { updateListItem, type ListItem } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { MaybePromise } from "../callbackTypes";
import { Button } from "../Button";
import Modal from "../Modal";
import { getAmountFieldLabel } from "./amountLabels";

type EditItemModalProps = {
    item: ListItem;
    listId: string;
    unitLabel?: string | null;
    onClose: () => void;
    onItemUpdated: () => MaybePromise<unknown>;
    onListNotFound: () => void;
    onReloadItem: (item: ListItem) => MaybePromise<unknown>;
};

export default function EditItemModal({
    item,
    listId,
    unitLabel,
    onClose,
    onItemUpdated,
    onListNotFound,
    onReloadItem,
}: EditItemModalProps) {
    const getAccessToken = useAccessToken();
    const [itemName, setItemName] = useState(item.name);
    const [itemAmount, setItemAmount] = useState(String(item.amount));
    const [itemIsCompleted, setItemIsCompleted] = useState(item.isCompleted);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");
    const [canReloadItem, setCanReloadItem] = useState(false);

    const itemNameId = "edit-item-name";
    const itemAmountId = "edit-item-amount";
    const itemCompletedId = "edit-item-completed";

    function closeEditModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleEditItem(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const updatedItemName = itemName.trim();
        const updatedItemAmount = Number(itemAmount);

        if (!updatedItemName) {
            setModalError("Enter an entry name.");
            return;
        }

        if (itemAmount.trim() === "" || !Number.isFinite(updatedItemAmount)) {
            setModalError("Enter a valid amount.");
            return;
        }

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await updateListItem(
                listId,
                item.id,
                {
                    name: updatedItemName,
                    amount: updatedItemAmount,
                    isCompleted: itemIsCompleted,
                    version: item.version,
                },
                { accessToken },
            );
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setModalError(
                getItemActionErrorMessage(error, "Could not update list entry."),
            );
            setCanReloadItem(isItemReloadableError(error));
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onItemUpdated();
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
                        form="edit-item-form"
                        type="submit"
                    >
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                )
            }
            className="edit-item-modal"
            isOpen
            onClose={isSubmitting ? undefined : closeEditModal}
            title="Edit Entry"
        >
            <form
                className="modal-form"
                id="edit-item-form"
                onSubmit={handleEditItem}
            >
                <label className="modal-form__field" htmlFor={itemNameId}>
                    <span>Entry name</span>
                    <input
                        data-autofocus
                        disabled={isSubmitting}
                        id={itemNameId}
                        maxLength={100}
                        name={itemNameId}
                        onChange={(event) => setItemName(event.target.value)}
                        placeholder="Entry Name"
                        required
                        type="text"
                        value={itemName}
                    />
                </label>

                <label className="modal-form__field" htmlFor={itemAmountId}>
                    <span>{getAmountFieldLabel(unitLabel)}</span>
                    <input
                        disabled={isSubmitting}
                        id={itemAmountId}
                        max="99999999.99"
                        min="-99999999.99"
                        name={itemAmountId}
                        onChange={(event) => setItemAmount(event.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        type="number"
                        value={itemAmount}
                    />
                </label>

                <label className="modal-form__field" htmlFor={itemCompletedId}>
                    <span>Completed</span>
                    <span className="modal-form__checkbox-control">
                        <input
                            checked={itemIsCompleted}
                            disabled={isSubmitting}
                            id={itemCompletedId}
                            name={itemCompletedId}
                            onChange={(event) =>
                                setItemIsCompleted(event.target.checked)
                            }
                            type="checkbox"
                        />
                    </span>
                </label>

                {modalError && (
                    <p className="modal-form__error" role="alert">
                        {modalError}
                    </p>
                )}
            </form>
        </Modal>
    );
}
