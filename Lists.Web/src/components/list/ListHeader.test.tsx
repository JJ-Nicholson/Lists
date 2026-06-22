import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../test/render";
import ListHeader from "./ListHeader";

describe("ListHeader", () => {
    it("renders the list heading and actions", () => {
        render(
            <ListHeader
                disabled={false}
                listName="Groceries"
                onAddItem={() => {}}
            />,
        );

        expect(
            screen.getByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to Lists" }))
            .toHaveAttribute("href", "/lists");
        expect(
            screen.getByRole("button", { name: "Add Entry" }),
        ).toBeEnabled();
    });

    it("calls onAddItem when Add Entry is clicked", async () => {
        const onAddItem = vi.fn();
        const { user } = render(
            <ListHeader
                disabled={false}
                listName="Groceries"
                onAddItem={onAddItem}
            />,
        );

        await user.click(screen.getByRole("button", { name: "Add Entry" }));

        expect(onAddItem).toHaveBeenCalledOnce();
    });

    it("disables navigation and item creation when disabled", () => {
        render(
            <ListHeader
                disabled
                listName="Groceries"
                onAddItem={() => {}}
            />,
        );

        expect(
            screen.queryByRole("link", { name: "Back to Lists" }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Back to Lists" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Add Entry" }),
        ).toBeDisabled();
    });
});
