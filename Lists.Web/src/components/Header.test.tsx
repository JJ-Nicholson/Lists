import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../test/render";
import Header from "./Header";

describe("Header", () => {
    it("shows the loading auth state", () => {
        render(<Header />, {
            auth0: {
                isAuthenticated: false,
                isLoading: true,
            },
        });

        expect(screen.getByRole("button", { name: "Loading..." }))
            .toBeDisabled();
        expect(screen.queryByRole("button", { name: "Login" }))
            .not.toBeInTheDocument();
    });

    it("renders unauthenticated actions and starts login flows", async () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        const { user } = render(<Header />, {
            auth0: {
                isAuthenticated: false,
                loginWithRedirect,
            },
            route: {
                pathname: "/setup-profile",
                state: {
                    returnTo: {
                        pathname: "/lists/42",
                        search: "?search=milk",
                        hash: "#hash",
                    },
                },
            },
        });

        expect(screen.getByRole("link", { name: "Lists" }))
            .toHaveAttribute("href", "/");

        await user.click(screen.getByRole("button", { name: "Login" }));
        await user.click(screen.getByRole("button", { name: "Get Started" }));

        expect(loginWithRedirect).toHaveBeenNthCalledWith(1, {
            appState: {
                returnTo: "/lists/42?search=milk#hash",
            },
        });
        expect(loginWithRedirect).toHaveBeenNthCalledWith(2, {
            appState: {
                returnTo: "/lists",
            },
            authorizationParams: {
                screen_hint: "signup",
            },
        });
    });

    it("does not use the auth callback route as the login return path", async () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        const { user } = render(<Header />, {
            auth0: {
                isAuthenticated: false,
                loginWithRedirect,
            },
            route: "/auth/callback?error=access_denied",
        });

        await user.click(screen.getByRole("button", { name: "Login" }));

        expect(loginWithRedirect).toHaveBeenCalledWith({
            appState: {
                returnTo: "/lists",
            },
        });
    });

    it("renders authenticated actions and logs out", async () => {
        const logout = vi.fn(async () => undefined);
        const { user } = render(<Header />, {
            auth0: {
                isAuthenticated: true,
                logout,
            },
        });

        expect(screen.getByRole("link", { name: "Lists" }))
            .toHaveAttribute("href", "/lists");
        expect(screen.getByRole("link", { name: "Your Lists" }))
            .toHaveAttribute("href", "/lists");

        await user.click(screen.getByRole("button", { name: "Logout" }));

        expect(logout).toHaveBeenCalledWith({
            logoutParams: {
                returnTo: window.location.origin,
            },
        });
    });
});
