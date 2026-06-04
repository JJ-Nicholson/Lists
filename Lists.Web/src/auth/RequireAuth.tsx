import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Outlet, useLocation } from "react-router";

export default function RequireAuth() {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
    const location = useLocation();
    const returnTo = `${location.pathname}${location.search}${location.hash}`;

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            loginWithRedirect({
                appState: { returnTo },
            });
        }
    }, [isAuthenticated, isLoading, loginWithRedirect, returnTo]);

    if (isLoading) {
        return <p>Loading...</p>;
    }

    if (!isAuthenticated) {
        return <p>Redirecting...</p>;
    }

    return <Outlet />;
}
