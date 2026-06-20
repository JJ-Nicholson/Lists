import type { SubmitEvent } from "react";
import { useState } from "react";

import { ApiError } from "../../api/client";
import { createList } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import type { MaybePromise } from "../callbackTypes";
import Modal from "../Modal";

type CreateListModalProps = {
    onClose: () => void;
    onListCreated: () => MaybePromise<unknown>;
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof ApiError ? error.message : fallbackMessage;
}

export default function CreateListModal({
    onClose,
    onListCreated,
}: CreateListModalProps) {
    const getAccessToken = useAccessToken();
    const [newListName, setNewListName] = useState("");
    const [newListUnitLabel, setNewListUnitLabel] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    const listNameId = "create-list-name";
    const listUnitLabelId = "create-list-unit-label";

    function closeCreateModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleCreateList(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const listName = newListName.trim();
        const unitLabel = newListUnitLabel.trim() || null;

        if (!listName) {
            setModalError("Enter a list name.");
            return;
        }

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await createList({ name: listName, unitLabel }, { accessToken });
        } catch (error) {
            setModalError(getErrorMessage(error, "Could not create list."));
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onListCreated();
    }

    return (
        <Modal
            actions={
                <>
                    <Button disabled={isSubmitting} onClick={closeCreateModal}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isSubmitting}
                        form="create-list-form"
                        type="submit"
                    >
                        {isSubmitting ? "Creating..." : "Create"}
                    </Button>
                </>
            }
            className="create-list-modal"
            isOpen={true}
            onClose={isSubmitting ? undefined : closeCreateModal}
            title="Create List"
        >
            <form
                className="modal-form"
                id="create-list-form"
                onSubmit={handleCreateList}
            >
                <label className="modal-form__field" htmlFor={listNameId}>
                    <span>List name</span>
                    <input
                        data-autofocus
                        disabled={isSubmitting}
                        id={listNameId}
                        maxLength={100}
                        name={listNameId}
                        onChange={(event) => setNewListName(event.target.value)}
                        placeholder="List Name"
                        required
                        type="text"
                        value={newListName}
                    />
                </label>

                <label className="modal-form__field" htmlFor={listUnitLabelId}>
                    <span>Units (optional)</span>
                    <input
                        disabled={isSubmitting}
                        id={listUnitLabelId}
                        maxLength={30}
                        name={listUnitLabelId}
                        onChange={(event) =>
                            setNewListUnitLabel(event.target.value)
                        }
                        placeholder="E.g., '$', 'items', 'kg', 'pages', 'hours', etc."
                        type="text"
                        value={newListUnitLabel}
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
