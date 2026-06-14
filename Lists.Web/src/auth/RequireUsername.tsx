import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { getCurrentUser, type User } from "../api/users";
import { useAccessToken } from "./useAccessToken";

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

export default function RequireUsername() {
    const getAccessToken = useAccessToken();
    const location = useLocation();
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadUser(): Promise<void> {
            setError("");

            try {
                const accessToken = await getAccessToken();
                const loadedUser = await getCurrentUser({
                    accessToken,
                    signal: controller.signal,
                });

                if (!controller.signal.aborted) {
                    setUser(loadedUser);
                }
            } catch (loadError) {
                if (isAbortError(loadError)) {
                    return;
                }

                setError(
                    "Could not check your profile. Refresh the page and try again.",
                );
            }
        }

        loadUser();

        return () => {
            controller.abort();
        };
    }, [getAccessToken]);

    if (error) {
        return <p role="alert">{error}</p>;
    }

    if (!user) {
        return <p>Loading...</p>;
    }

    if (user.needsUsername) {
        return (
            <Navigate
                replace
                state={{ returnTo: location }}
                to="/setup-profile"
            />
        );
    }

    return <Outlet />;
}
