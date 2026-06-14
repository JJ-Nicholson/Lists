import { useAuth0 } from "@auth0/auth0-react";
import type { ReactElement } from "react";
import { useLocation } from "react-router";

import { Button, ButtonLink } from "./Button";

type ReturnToLocation = {
    pathname?: unknown;
    search?: unknown;
    hash?: unknown;
};

type ReturnToState = {
    returnTo?: ReturnToLocation;
};

function isBlockedReturnPath(pathname: string): boolean {
    return pathname === "/auth/callback";
}

function getLocationPath(location: ReturnToLocation): string | undefined {
    if (typeof location.pathname !== "string") {
        return undefined;
    }

    if (isBlockedReturnPath(location.pathname)) {
        return undefined;
    }

    const search = typeof location.search === "string" ? location.search : "";
    const hash = typeof location.hash === "string" ? location.hash : "";

    return `${location.pathname}${search}${hash}`;
}

function getReturnTo(
    locationState: unknown,
    currentLocation: ReturnToLocation,
): string {
    const state = locationState as ReturnToState | null;
    const savedReturnTo = state?.returnTo
        ? getLocationPath(state.returnTo)
        : undefined;
    const currentReturnTo = getLocationPath(currentLocation);

    return savedReturnTo ?? currentReturnTo ?? "/lists";
}

export default function Header(): ReactElement {
    const {
        isAuthenticated,
        isLoading,
        loginWithRedirect,
        logout: auth0Logout,
    } = useAuth0();
    const location = useLocation();
    const brandTo = isAuthenticated ? "/lists" : "/";

    function login(): void {
        loginWithRedirect({
            appState: { returnTo: getReturnTo(location.state, location) },
        });
    }

    function signup(): void {
        loginWithRedirect({
            appState: { returnTo: "/lists" },
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
            <ButtonLink
                aria-label="Lists"
                className="site-header__brand"
                size="large"
                to={brandTo}
                variant="header"
            >
                <svg
                    aria-hidden="true"
                    className="site-header__brand-mark"
                    focusable="false"
                    viewBox="0 0 52 52"
                >
                    <path
                        d="M13 8h25a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z"
                        fill="var(--primary-shade)"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />
                    <path
                        d="M17 5v8M25 5v8M33 5v8"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />
                    <path
                        d="M16 20h17M16 27h14M16 34h10"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="3"
                    />
                    <path
                        d="M30 38.5 41 27.5l5.5 5.5-11 11H30v-5.5Z"
                        fill="var(--secondary-tint)"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />
                    <path
                        d="m41 27.5 2.5-2.5a2.5 2.5 0 0 1 3.5 0l2 2a2.5 2.5 0 0 1 0 3.5L46.5 33"
                        fill="var(--pencil-rubber-pink)"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />
                    <path
                        d="M30 38.5V44h5.5"
                        fill="var(--primary-shade)"
                        stroke="currentColor"
                        strokeLinejoin="round"
                        strokeWidth="3"
                    />
                </svg>
                <span className="site-header__brand-text">Lists</span>
            </ButtonLink>

            <nav className="site-header__nav" aria-label="Primary">
                {isLoading ? (
                    <Button disabled variant="header">
                        Loading...
                    </Button>
                ) : isAuthenticated ? (
                    <>
                        <ButtonLink to="/lists" variant="header">
                            Your Lists
                        </ButtonLink>
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
