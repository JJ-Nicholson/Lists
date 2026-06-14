import { Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { act, render, screen } from "../test/render";
import { getAuth0ProviderProps } from "../test/auth0";
import Auth0ProviderWithNavigate from "./Auth0ProviderWithNavigate";

function LocationDisplay() {
    const location = useLocation();

    return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
}

function renderProvider() {
    return render(
        <Routes>
            <Route
                path="*"
                element={
                    <Auth0ProviderWithNavigate>
                        <LocationDisplay />
                    </Auth0ProviderWithNavigate>
                }
            />
        </Routes>,
        { route: "/auth/callback" },
    );
}

describe("Auth0ProviderWithNavigate", () => {
    it("configures Auth0 with the callback URL and renders children", () => {
        renderProvider();

        const providerProps = getAuth0ProviderProps();

        expect(screen.getByText("/auth/callback")).toBeInTheDocument();

        if (!("authorizationParams" in providerProps)) {
            throw new Error("Expected Auth0 configuration options.");
        }

        expect(providerProps.authorizationParams?.redirect_uri).toBe(
            `${window.location.origin}/auth/callback`,
        );
        expect(providerProps.onRedirectCallback).toEqual(expect.any(Function));
    });

    it("redirects to the Auth0 return path", async () => {
        renderProvider();

        await act(async () => {
            getAuth0ProviderProps().onRedirectCallback?.({
                returnTo: "/lists?page=2",
            });
        });

        expect(screen.getByText("/lists?page=2")).toBeInTheDocument();
    });

    it("redirects to lists when Auth0 does not provide a return path", async () => {
        renderProvider();

        await act(async () => {
            getAuth0ProviderProps().onRedirectCallback?.();
        });

        expect(screen.getByText("/lists")).toBeInTheDocument();
    });
});
