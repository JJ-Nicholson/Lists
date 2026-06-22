import type { SubmitEvent } from "react";
import { useState } from "react";

import { ApiError } from "../../api/client";
import { updateCurrentUser, type User } from "../../api/users";
import { useAccessToken } from "../../auth/useAccessToken";
import { Button } from "../Button";
import Modal from "../Modal";

type SetUsernameModalProps = {
    currentUsername: string | null;
    onClose: () => void;
    onUserUpdated: (user: User) => void;
};

export default function SetUsernameModal({
    currentUsername,
    onClose,
    onUserUpdated,
}: SetUsernameModalProps) {
    const getAccessToken = useAccessToken();
    const [username, setUsername] = useState(currentUsername ?? "");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const title = currentUsername ? "Change Username" : "Set Username";

    function closeModal(): void {
        if (!isSubmitting) {
            onClose();
        }
    }

    async function handleSubmit(
        event: SubmitEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        const trimmedUsername = username.trim();

        if (!trimmedUsername) {
            setError("Enter a username.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const accessToken = await getAccessToken();
            const updatedUser = await updateCurrentUser(
                trimmedUsername,
                accessToken,
            );

            onUserUpdated(updatedUser);
        } catch (updateError) {
            setError(
                updateError instanceof ApiError
                    ? updateError.message
                    : "Could not save your username.",
            );
            setIsSubmitting(false);
        }
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
                        form="set-username-form"
                        type="submit"
                    >
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                </>
            }
            isOpen={true}
            onClose={isSubmitting ? undefined : closeModal}
            title={title}
        >
            <form
                className="modal-form"
                id="set-username-form"
                onSubmit={handleSubmit}
            >
                <label className="modal-form__field" htmlFor="profile-username">
                    <span>Username</span>
                    <input
                        autoComplete="username"
                        data-autofocus
                        disabled={isSubmitting}
                        id="profile-username"
                        maxLength={50}
                        minLength={2}
                        onChange={(event) => setUsername(event.target.value)}
                        pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                        placeholder="username"
                        required
                        type="text"
                        value={username}
                    />
                </label>

                {error && (
                    <p className="modal-form__error" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}
