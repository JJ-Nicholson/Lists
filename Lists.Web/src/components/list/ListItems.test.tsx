import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ListItem } from "../../api/lists";
import { render, screen, within } from "../../test/render";
import ListItems from "./ListItems";

function createItem(overrides: Partial<ListItem> = {}): ListItem {
    return {
        id: 1,
        name: "Milk",
        amount: 5,
        isCompleted: false,
        version: 7,
        ...overrides,
    };
}

const defaultProps: ComponentProps<typeof ListItems> = {
    disabled: false,
    emptyMessage: "No entries yet",
    errorItemId: null,
    itemError: "",
    items: [],
    listName: "Groceries",
    onDeleteItem: () => {},
    onEditItem: () => {},
    onItemCompletedChange: () => {},
    onReloadItemError: () => {},
};

function renderItems(overrides: Partial<ComponentProps<typeof ListItems>> = {}) {
    return render(<ListItems {...defaultProps} {...overrides} />);
}

describe("ListItems", () => {
    it("shows an empty message when there are no items", () => {
        renderItems();

        expect(screen.getByText("No entries yet")).toBeInTheDocument();
    });

    it("renders nothing without items or an empty message", () => {
        const { container } = renderItems({ emptyMessage: null });

        expect(container).toBeEmptyDOMElement();
    });

    it("renders a row for each item", () => {
        renderItems({
            items: [
                createItem(),
                createItem({ id: 2, name: "Bread" }),
            ],
        });

        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("Bread")).toBeInTheDocument();
    });

    it("applies an error only to the affected row", async () => {
        const onReloadItemError = vi.fn();
        const { user } = renderItems({
            errorItemId: 1,
            itemError: "This entry changed.",
            items: [
                createItem(),
                createItem({ id: 2, name: "Bread" }),
            ],
            onReloadItemError,
        });

        const milkRow = screen.getByText("Milk").closest("article");
        const breadRow = screen.getByText("Bread").closest("article");
        expect(milkRow).not.toBeNull();
        expect(breadRow).not.toBeNull();
        expect(within(milkRow!).getByRole("alert")).toHaveTextContent(
            "This entry changed.",
        );
        expect(within(milkRow!).getByRole("checkbox")).toBeDisabled();
        expect(within(breadRow!).getByRole("checkbox")).toBeEnabled();

        await user.click(
            within(milkRow!).getByRole("button", { name: "Reload List" }),
        );

        expect(onReloadItemError).toHaveBeenCalledOnce();
    });
});
