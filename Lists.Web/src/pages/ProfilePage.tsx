import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";

import { getCurrentUser, type User } from "../api/users";
import { useAccessToken } from "../auth/useAccessToken";
import { Button } from "../components/Button";
import DeleteAccountModal from "../components/profile/DeleteAccountModal";
import SetUsernameModal from "../components/profile/SetUsernameModal";

function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
}

export default function ProfilePage() {
    const { logout: auth0Logout } = useAuth0();
    const getAccessToken = useAccessToken();
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState("");
    const [isSetUsernameOpen, setIsSetUsernameOpen] = useState(false);
    const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

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
                if (!isAbortError(loadError)) {
                    setError(
                        "Could not load your profile. Refresh the page and try again.",
                    );
                }
            }
        }

        loadUser();

        return () => controller.abort();
    }, [getAccessToken]);

    function logout(): void {
        auth0Logout({
            logoutParams: { returnTo: window.location.origin },
        });
    }

    function handleUserUpdated(updatedUser: User): void {
        setUser(updatedUser);
        setIsSetUsernameOpen(false);
    }

    return (
        <article className="content-page profile">
            <header>
                <p className="eyebrow">Profile</p>
                <h1 className="heading heading--small profile__heading">
                    {user?.username ?? "Your Profile"}
                </h1>
                <p className="lede">Manage your Lists account.</p>
            </header>

            {error ? (
                <p role="alert">{error}</p>
            ) : !user ? (
                <p>Loading...</p>
            ) : (
                <section className="content-page__section">
                    <h2>Username</h2>
                    <p>
                        {user.username
                            ? "Your username is used when sharing lists."
                            : "Set a username to create and share lists."}
                    </p>
                    <div className="profile__actions">
                        <Button onClick={() => setIsSetUsernameOpen(true)}>
                            {user.username
                                ? "Change Username"
                                : "Set Username"}
                        </Button>
                    </div>
                </section>
            )}

            <section className="content-page__section">
                <h2>Session</h2>
                <div className="profile__actions">
                    <Button onClick={logout}>Logout</Button>
                </div>
            </section>

            {user && (
                <section className="content-page__section">
                    <h2>Delete Account</h2>
                    <p>
                        Permanently delete your account and the lists you own.
                    </p>
                    <div className="profile__actions">
                        <Button
                            onClick={() => setIsDeleteAccountOpen(true)}
                            variant="danger"
                        >
                            Delete Account
                        </Button>
                    </div>
                </section>
            )}

            {user && isSetUsernameOpen && (
                <SetUsernameModal
                    currentUsername={user.username}
                    onClose={() => setIsSetUsernameOpen(false)}
                    onUserUpdated={handleUserUpdated}
                />
            )}

            {isDeleteAccountOpen && (
                <DeleteAccountModal
                    onAccountDeleted={logout}
                    onClose={() => setIsDeleteAccountOpen(false)}
                />
            )}
        </article>
    );
}
