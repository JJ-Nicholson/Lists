import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ListItem } from "../../api/lists";
import { render, screen } from "../../test/render";
import ListItemRow from "./ListItemRow";

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

function renderRow(overrides: Partial<ComponentProps<typeof ListItemRow>> = {}) {
    return render(
        <ListItemRow
            disabled={false}
            error=""
            item={createItem()}
            onCompletedChange={() => {}}
            onDeleteItem={() => {}}
            onEditItem={() => {}}
            onReloadError={() => {}}
            unitLabel="items"
            {...overrides}
        />,
    );
}

describe("ListItemRow", () => {
    it("renders completed item details", () => {
        const { container } = renderRow({
            item: createItem({ isCompleted: true }),
        });

        expect(screen.getByText("Milk")).toBeInTheDocument();
        expect(screen.getByText("5 items")).toBeInTheDocument();
        expect(
            screen.getByRole("checkbox", {
                name: "Mark Milk as not completed",
            }),
        ).toBeChecked();
        expect(container.querySelector(".list-item-row--completed"))
            .toBeInTheDocument();
    });

    it("calls item action callbacks", async () => {
        const item = createItem();
        const onCompletedChange = vi.fn();
        const onDeleteItem = vi.fn();
        const onEditItem = vi.fn();
        const { user } = renderRow({
            item,
            onCompletedChange,
            onDeleteItem,
            onEditItem,
        });

        await user.click(screen.getByRole("checkbox"));
        await user.click(screen.getByRole("button", { name: "Edit Milk" }));
        await user.click(screen.getByRole("button", { name: "Delete Milk" }));

        expect(onCompletedChange).toHaveBeenCalledWith(item.id);
        expect(onEditItem).toHaveBeenCalledWith(item);
        expect(onDeleteItem).toHaveBeenCalledWith(item);
    });

    it("disables item actions while keeping error reload available", async () => {
        const onReloadError = vi.fn();
        const { user } = renderRow({
            disabled: true,
            error: "This entry changed.",
            onReloadError,
        });

        expect(screen.getByRole("checkbox")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Edit Milk" })).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Delete Milk" }),
        ).toBeDisabled();
        expect(screen.getByRole("alert")).toHaveTextContent(
            "This entry changed.",
        );

        await user.click(screen.getByRole("button", { name: "Reload List" }));

        expect(onReloadError).toHaveBeenCalledOnce();
    });
});
