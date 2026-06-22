import type { SubmitEvent } from "react";
import { useState } from "react";

import {
    getListActionErrorMessage,
    isListNotFoundError,
} from "../../api/errorMessages";
import { createListItem } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import type { MaybePromise } from "../callbackTypes";
import { Button } from "../Button";
import Modal from "../Modal";
import { getAmountFieldLabel } from "./amountLabels";

type CreateItemModalProps = {
    listId: string;
    unitLabel?: string | null;
    onClose: () => void;
    onItemCreated: () => MaybePromise<unknown>;
    onListNotFound: () => void;
};

export default function CreateItemModal({
    listId,
    unitLabel,
    onClose,
    onItemCreated,
    onListNotFound,
}: CreateItemModalProps) {
    const getAccessToken = useAccessToken();
    const [newItemName, setNewItemName] = useState("");
    const [newItemAmount, setNewItemAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    const itemNameId = "create-item-name";
    const itemAmountId = "create-item-amount";

    function closeCreateModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleCreateItem(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const itemName = newItemName.trim();
        const itemAmount = Number(newItemAmount);

        if (!itemName) {
            setModalError("Enter an entry name.");
            return;
        }

        if (newItemAmount.trim() === "" || !Number.isFinite(itemAmount)) {
            setModalError("Enter a valid amount.");
            return;
        }

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await createListItem(
                listId,
                {
                    name: itemName,
                    amount: itemAmount,
                },
                { accessToken },
            );
        } catch (error) {
            if (isListNotFoundError(error)) {
                onListNotFound();
                return;
            }

            setModalError(
                getListActionErrorMessage(error, "Could not create list entry."),
            );
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onItemCreated();
    }

    return (
        <Modal
            actions={
                <Button
                    disabled={isSubmitting}
                    form="create-item-form"
                    type="submit"
                >
                    {isSubmitting ? "Creating..." : "Create"}
                </Button>
            }
            className="create-item-modal"
            isOpen={true}
            onClose={isSubmitting ? undefined : closeCreateModal}
            title="Add Entry"
        >
            <form
                className="modal-form"
                id="create-item-form"
                onSubmit={handleCreateItem}
            >
                <label className="modal-form__field" htmlFor={itemNameId}>
                    <span>Entry name</span>
                    <input
                        data-autofocus
                        disabled={isSubmitting}
                        id={itemNameId}
                        maxLength={100}
                        name={itemNameId}
                        onChange={(event) => setNewItemName(event.target.value)}
                        placeholder="Entry Name"
                        required
                        type="text"
                        value={newItemName}
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
                        onChange={(event) => setNewItemAmount(event.target.value)}
                        placeholder="0.00"
                        required
                        step="0.01"
                        type="number"
                        value={newItemAmount}
                    />
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
