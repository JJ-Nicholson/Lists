import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

export function useAccessToken() {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0();

    return useCallback(async () => {
        if (!isAuthenticated) {
            return undefined;
        }

        return getAccessTokenSilently();
    }, [getAccessTokenSilently, isAuthenticated]);
}
