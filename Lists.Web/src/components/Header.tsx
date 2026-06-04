import { useAuth0 } from "@auth0/auth0-react";
import type { ReactElement } from "react";
import { useLocation } from "react-router";

import { Button } from "./Button";

type ReturnToLocation = {
    pathname?: unknown;
    search?: unknown;
    hash?: unknown;
};

type ReturnToState = {
    returnTo?: ReturnToLocation;
};

function getLocationPath(location: ReturnToLocation): string | undefined {
    if (typeof location.pathname !== "string") {
        return undefined;
    }

    const search = typeof location.search === "string" ? location.search : "";
    const hash = typeof location.hash === "string" ? location.hash : "";

    return `${location.pathname}${search}${hash}`;
}

function getReturnTo(locationState: unknown): string {
    const state = locationState as ReturnToState | null;
    const savedReturnTo = state?.returnTo
        ? getLocationPath(state.returnTo)
        : undefined;

    return (
        savedReturnTo ??
        `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
}

export default function Header(): ReactElement {
    const {
        isAuthenticated,
        isLoading,
        loginWithRedirect,
        logout: auth0Logout,
    } = useAuth0();
    const location = useLocation();

    function login(): void {
        loginWithRedirect({
            appState: { returnTo: getReturnTo(location.state) },
        });
    }

    function signup(): void {
        loginWithRedirect({
            appState: { returnTo: getReturnTo(location.state) },
            authorizationParams: { screen_hint: "signup" },
        });
    }

    function logout(): void {
        auth0Logout({
            logoutParams: { returnTo: window.location.origin },
        });
    }

    return (
        <header className="site-header">
            <nav className="site-header__nav" aria-label="Primary">
                {isLoading ? (
                    <Button disabled variant="header">
                        Loading...
                    </Button>
                ) : isAuthenticated ? (
                    <>
                        <Button disabled variant="header">
                            Signed in
                        </Button>
                        <Button onClick={logout} variant="header">
                            Logout
                        </Button>
                    </>
                ) : (
                    <>
                        <Button onClick={login} variant="header">
                            Login
                        </Button>
                        <Button onClick={signup} variant="header">
                            Get Started
                        </Button>
                    </>
                )}
            </nav>
        </header>
    );
}
