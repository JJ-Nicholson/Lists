import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../test/render";
import AuthCallbackPage from "./AuthCallbackPage";

describe("AuthCallbackPage", () => {
    it("shows loading while Auth0 is processing the callback", () => {
        render(<AuthCallbackPage />, {
            auth0: {
                isLoading: true,
            },
        });

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("shows redirecting when Auth0 has finished without an error", () => {
        render(<AuthCallbackPage />, {
            auth0: {
                isLoading: false,
            },
        });

        expect(screen.getByText("Redirecting...")).toBeInTheDocument();
    });

    it("shows a recovery link when sign in or sign up was not completed", () => {
        render(<AuthCallbackPage />, {
            auth0: {
                error: new Error("access_denied"),
                isLoading: false,
            },
        });

        expect(
            screen.getByRole("heading", {
                name: "Failed to authenticate",
            }),
        ).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Your sign in or sign up was cancelled or could not be completed.",
        );
        expect(screen.getByRole("link", { name: "Lists" }))
            .toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: "try again" }))
            .toHaveAttribute("href", "/lists");
    });

    it("starts login again with a safe return path", async () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        const { user } = render(<AuthCallbackPage />, {
            auth0: {
                error: new Error("access_denied"),
                isLoading: false,
                loginWithRedirect,
            },
            route: "/auth/callback?error=access_denied",
        });

        await user.click(screen.getByRole("link", { name: "try again" }));

        expect(loginWithRedirect).toHaveBeenCalledWith({
            appState: {
                returnTo: "/lists",
            },
        });
    });
});
