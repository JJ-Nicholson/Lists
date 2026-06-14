import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../test/render";
import HomePage from "./HomePage";

describe("HomePage", () => {
    it("starts login flows from the hero actions", async () => {
        const loginWithRedirect = vi.fn(async () => undefined);
        const { user } = render(<HomePage />, {
            auth0: {
                isAuthenticated: false,
                loginWithRedirect,
            },
        });

        await user.click(screen.getByRole("button", { name: "Login" }));
        await user.click(screen.getByRole("button", { name: "Get Started" }));

        expect(loginWithRedirect).toHaveBeenNthCalledWith(1, {
            appState: {
                returnTo: "/lists",
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

    it("renders the lists preview with disabled controls", () => {
        render(<HomePage />, {
            auth0: {
                isAuthenticated: false,
            },
        });

        expect(screen.getByRole("heading", { name: "Lists" }))
            .toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Lists page preview" }))
            .toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create List" }))
            .toBeDisabled();
        expect(screen.getByLabelText("Search")).toBeDisabled();
        expect(screen.getByLabelText("Sort alphabetically")).toBeDisabled();
        expect(screen.getByLabelText("Per page")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Edit To-Do List" }))
            .toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Review access to To-Do List" }),
        ).toBeDisabled();
        expect(screen.getByRole("button", { name: "Delete To-Do List" }))
            .toBeDisabled();
        expect(screen.queryByRole("link", { name: "Open To-Do List" }))
            .not.toBeInTheDocument();
    });
});
