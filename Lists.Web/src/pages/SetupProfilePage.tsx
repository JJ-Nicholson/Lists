import type { SubmitEvent } from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { ApiError } from "../api/client";
import { updateCurrentUser } from "../api/users";
import { useAccessToken } from "../auth/useAccessToken";
import { Button } from "../components/Button";

type ReturnToLocation = {
    pathname?: unknown;
    search?: unknown;
    hash?: unknown;
};

type ReturnToState = {
    returnTo?: ReturnToLocation;
};

function getReturnTo(locationState: unknown): string {
    const state = locationState as ReturnToState | null;
    const returnTo = state?.returnTo;

    if (
        !returnTo ||
        typeof returnTo.pathname !== "string" ||
        returnTo.pathname === "/setup-profile"
    ) {
        return "/lists";
    }

    const search = typeof returnTo.search === "string" ? returnTo.search : "";
    const hash = typeof returnTo.hash === "string" ? returnTo.hash : "";

    return `${returnTo.pathname}${search}${hash}`;
}

function getUserErrorMessage(error: unknown, fallbackMessage: string): string {
    return error instanceof ApiError ? error.message : fallbackMessage;
}

export default function SetupProfilePage() {
    const getAccessToken = useAccessToken();
    const location = useLocation();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            await updateCurrentUser(trimmedUsername, accessToken);
            navigate(getReturnTo(location.state), { replace: true });
        } catch (updateError) {
            setError(
                getUserErrorMessage(updateError, "Could not save your username."),
            );
            setIsSubmitting(false);
        }
    }

    return (
        <article className="content-page profile-setup">
            <div>
                <p className="eyebrow">Almost there</p>
                <h1 className="heading heading--small">Choose a username</h1>
            </div>

            <form
                className="modal-form profile-setup__form"
                onSubmit={handleSubmit}
            >
                <label className="modal-form__field" htmlFor="setup-username">
                    <span>Username</span>
                    <input
                        autoComplete="username"
                        disabled={isSubmitting}
                        id="setup-username"
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

                <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : "Continue"}
                </Button>
            </form>
        </article>
    );
}
