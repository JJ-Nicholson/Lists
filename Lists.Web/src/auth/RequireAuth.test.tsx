import { Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import type { Auth0MockOverrides } from "../test/auth0";
import { render, screen, waitFor } from "../test/render";
import RequireAuth from "./RequireAuth";

function renderRequireAuth(
    auth0: Auth0MockOverrides,
    route = "/lists?search=milk#items",
) {
    return render(
        <Routes>
            <Route element={<RequireAuth />}>
                <Route path="/lists" element={<p>Protected lists</p>} />
            </Route>
        </Routes>,
        {
            auth0,
            route,
        },
    );
}

describe("RequireAuth", () => {
    it("shows loading while Auth0 is loading", () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        renderRequireAuth({
            isAuthenticated: false,
            isLoading: true,
            loginWithRedirect,
        });

        expect(screen.getByText("Loading...")).toBeInTheDocument();
        expect(loginWithRedirect).not.toHaveBeenCalled();
    });

    it("starts login and preserves the current route when unauthenticated", async () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        renderRequireAuth({
            isAuthenticated: false,
            loginWithRedirect,
        });

        expect(screen.getByText("Redirecting...")).toBeInTheDocument();
        await waitFor(() => {
            expect(loginWithRedirect).toHaveBeenCalledWith({
                appState: {
                    returnTo: "/lists?search=milk#items",
                },
            });
        });
    });

    it("renders the protected route when authenticated", () => {
        renderRequireAuth({
            isAuthenticated: true,
        });

        expect(screen.getByText("Protected lists")).toBeInTheDocument();
    });
});
