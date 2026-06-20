import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "../test/render";
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

        const listsPreview = screen.getByRole("region", {
            name: "Lists page preview",
        });
        const listPreview = screen.getByRole("region", {
            name: "List page preview",
        });

        expect(within(listsPreview).getByRole("heading", { name: "Your Lists" }))
            .toBeInTheDocument();
        expect(within(listsPreview).getByRole("button", { name: "Create List" }))
            .toBeDisabled();
        expect(within(listsPreview).getByLabelText("Search")).toBeDisabled();
        expect(within(listsPreview).getByLabelText("Sort alphabetically"))
            .toBeDisabled();
        expect(within(listsPreview).getByLabelText("Per page")).toBeDisabled();
        expect(within(listsPreview).getByRole("button", { name: "Edit To-Do List" }))
            .toBeDisabled();
        expect(
            within(listsPreview).getByRole("button", {
                name: "Review access to To-Do List",
            }),
        ).toBeDisabled();
        expect(within(listsPreview).getByRole("button", { name: "Delete To-Do List" }))
            .toBeDisabled();
        expect(within(listsPreview).queryByRole("link", { name: "Open To-Do List" }))
            .not.toBeInTheDocument();

        expect(within(listPreview).getByRole("heading", { name: "Weekly Shop" }))
            .toBeInTheDocument();
        expect(within(listPreview).getByRole("button", { name: "Back to Lists" }))
            .toBeDisabled();
        expect(within(listPreview).getByRole("button", { name: "Add Entry" }))
            .toBeDisabled();
        expect(within(listPreview).getByLabelText("Search")).toBeDisabled();
        expect(within(listPreview).getByLabelText("Filter by")).toBeDisabled();
        expect(within(listPreview).getByRole("checkbox", {
            name: "Mark Coffee Beans as completed",
        })).toBeDisabled();
    });
});
