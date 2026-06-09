import type { SubmitEvent } from "react";
import { useState } from "react";

import { ApiError } from "../../api/client";
import { deleteList, type ListSummary } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import Modal from "../Modal";

type DeleteListModalProps = {
    list: ListSummary;
    onClose: () => void;
    onListDeleted: () => Promise<void> | void;
};

function getErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof ApiError ? error.message : fallbackMessage;
}

export default function DeleteListModal({
    list,
    onClose,
    onListDeleted,
}: DeleteListModalProps) {
    const getAccessToken = useAccessToken();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");

    function closeDeleteModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleDeleteList(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await deleteList(list.id, list.version, { accessToken });
        } catch (error) {
            setModalError(getErrorMessage(error, "Could not delete list."));
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onListDeleted();
    }

    return (
        <Modal
            actions={
                <>
                    <Button disabled={isSubmitting} onClick={closeDeleteModal}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isSubmitting}
                        form="delete-list-form"
                        type="submit"
                        variant="danger"
                    >
                        {isSubmitting ? "Deleting..." : "Delete"}
                    </Button>
                </>
            }
            className="delete-list-modal"
            isOpen={true}
            onClose={isSubmitting ? undefined : closeDeleteModal}
            title="Delete List"
        >
            <form
                className="modal-form"
                id="delete-list-form"
                onSubmit={handleDeleteList}
            >
                <p>
                    Are you sure you want to delete{" "}
                    <strong>{list.name}</strong>? Doing so will permanently
                    remove the list, preventing you and all collaborators from
                    accessing it.
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
