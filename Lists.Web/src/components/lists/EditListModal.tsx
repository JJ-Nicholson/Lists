import type { SubmitEvent } from "react";
import { useState } from "react";

import {
    getListActionErrorMessage,
    isListReloadableError,
} from "../../api/errorMessages";
import { updateList, type ListSummary } from "../../api/lists";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import type { MaybePromise } from "../callbackTypes";
import Modal from "../Modal";

type EditListModalProps = {
    list: ListSummary;
    onClose: () => void;
    onListUpdated: () => MaybePromise<unknown>;
    onReloadList: (list: ListSummary) => MaybePromise<unknown>;
};

export default function EditListModal({
    list,
    onClose,
    onListUpdated,
    onReloadList,
}: EditListModalProps) {
    const getAccessToken = useAccessToken();
    const [listName, setListName] = useState(list.name);
    const [listUnitLabel, setListUnitLabel] = useState(list.unitLabel ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState("");
    const [canReloadList, setCanReloadList] = useState(false);

    const listNameId = "edit-list-name";
    const listUnitLabelId = "edit-list-unit-label";

    function closeEditModal(): void {
        if (isSubmitting) {
            return;
        }

        onClose();
    }

    async function handleEditList(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const updatedListName = listName.trim();
        const updatedUnitLabel = listUnitLabel.trim() || null;

        if (!updatedListName) {
            setModalError("Enter a list name.");
            return;
        }

        setIsSubmitting(true);
        setModalError("");

        try {
            const accessToken = await getAccessToken();
            await updateList(
                list.id,
                {
                    name: updatedListName,
                    unitLabel: updatedUnitLabel,
                    version: list.version,
                },
                { accessToken },
            );
        } catch (error) {
            setModalError(
                getListActionErrorMessage(error, "Could not update list."),
            );
            setCanReloadList(isListReloadableError(error));
            setIsSubmitting(false);
            return;
        }

        onClose();
        await onListUpdated();
    }

    async function handleReloadList(): Promise<void> {
        setIsSubmitting(true);
        setModalError("");

        try {
            await onReloadList(list);
            setIsSubmitting(false);
        } catch {
            setModalError("Could not reload list.");
            setCanReloadList(true);
            setIsSubmitting(false);
        }
    }

    return (
        <Modal
            actions={
                <>
                    <Button disabled={isSubmitting} onClick={closeEditModal}>
                        Cancel
                    </Button>
                    {canReloadList ? (
                        <Button disabled={isSubmitting} onClick={handleReloadList}>
                            {isSubmitting ? "Reloading Lists..." : "Reload Lists"}
                        </Button>
                    ) : (
                        <Button
                            disabled={isSubmitting}
                            form="edit-list-form"
                            type="submit"
                        >
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    )}
                </>
            }
            className="edit-list-modal"
            isOpen={true}
            onClose={isSubmitting ? undefined : closeEditModal}
            title="Edit List"
        >
            <form
                className="modal-form"
                id="edit-list-form"
                onSubmit={handleEditList}
            >
                <label className="modal-form__field" htmlFor={listNameId}>
                    <span>List name</span>
                    <input
                        data-autofocus
                        disabled={isSubmitting}
                        id={listNameId}
                        maxLength={100}
                        name={listNameId}
                        onChange={(event) => setListName(event.target.value)}
                        placeholder="List Name"
                        required
                        type="text"
                        value={listName}
                    />
                </label>

                <label className="modal-form__field" htmlFor={listUnitLabelId}>
                    <span>Units (optional)</span>
                    <input
                        disabled={isSubmitting}
                        id={listUnitLabelId}
                        maxLength={30}
                        name={listUnitLabelId}
                        onChange={(event) => setListUnitLabel(event.target.value)}
                        placeholder="E.g., '$', 'items', 'kg', 'pages', 'hours', etc."
                        type="text"
                        value={listUnitLabel}
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
