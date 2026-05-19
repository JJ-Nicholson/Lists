import { useAuth0 } from "@auth0/auth0-react";
import type { ReactElement } from "react";
import { Button } from "./Button";

function getReturnTo(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export default function Header(): ReactElement {
    const {
        isAuthenticated,
        isLoading,
        loginWithRedirect,
        logout: auth0Logout,
    } = useAuth0();

    function login(): void {
        loginWithRedirect({
            appState: { returnTo: getReturnTo() },
        });
    }

    function signup(): void {
        loginWithRedirect({
            appState: { returnTo: getReturnTo() },
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
