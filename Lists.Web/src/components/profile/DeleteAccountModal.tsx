import type { SubmitEvent } from "react";
import { useState } from "react";

import { ApiError } from "../../api/client";
import {
    deleteCurrentUser,
    isAccountDeletionIncompleteError,
} from "../../api/users";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import Modal from "../Modal";

type DeleteAccountModalProps = {
    onAccountDeleted: () => void;
    onClose: () => void;
};

export default function DeleteAccountModal({
    onAccountDeleted,
    onClose,
}: DeleteAccountModalProps) {
    const getAccessToken = useAccessToken();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    function closeModal(): void {
        if (!isSubmitting) {
            onClose();
        }
    }

    async function handleDeleteAccount(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        setIsSubmitting(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            await deleteCurrentUser(accessToken);
        } catch (deleteError) {
            if (isAccountDeletionIncompleteError(deleteError)) {
                onAccountDeleted();
                return;
            }

            setError(
                deleteError instanceof ApiError
                    ? deleteError.message
                    : "Could not delete your account.",
            );
            setIsSubmitting(false);
            return;
        }

        onAccountDeleted();
    }

    return (
        <Modal
            actions={
                <>
                    <Button disabled={isSubmitting} onClick={closeModal}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isSubmitting}
                        form="delete-account-form"
                        type="submit"
                        variant="danger"
                    >
                        {isSubmitting ? "Deleting..." : "Delete Account"}
                    </Button>
                </>
            }
            isOpen={true}
            onClose={isSubmitting ? undefined : closeModal}
            title="Delete Account"
        >
            <form
                className="modal-form"
                id="delete-account-form"
                onSubmit={handleDeleteAccount}
            >
                <p>
                    Are you sure you want to delete your account? This will
                    permanently remove your username, lists you own, and their
                    entries. Other users will lose access to those lists, and
                    you will lose access to lists shared with you.
                </p>
                <span>This action cannot be undone.</span>

                {error && (
                    <p className="modal-form__error" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}
