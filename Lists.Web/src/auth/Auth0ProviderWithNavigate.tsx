import { Auth0Provider, type AppState } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

type Auth0ProviderWithNavigateProps = {
    children: ReactNode;
};

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN ?? "";
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID ?? "";
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const authorizationParams = {
    redirect_uri: `${window.location.origin}/auth/callback`,
    ...(auth0Audience ? { audience: auth0Audience } : {}),
};

export default function Auth0ProviderWithNavigate({
    children,
}: Auth0ProviderWithNavigateProps) {
    const navigate = useNavigate();

    function onRedirectCallback(appState?: AppState): void {
        const returnTo =
            typeof appState?.returnTo === "string" ? appState.returnTo : "/lists";

        navigate(returnTo, { replace: true });
    }

    return (
        <Auth0Provider
            authorizationParams={authorizationParams}
            clientId={auth0ClientId}
            domain={auth0Domain}
            onRedirectCallback={onRedirectCallback}
        >
            {children}
        </Auth0Provider>
    );
}
