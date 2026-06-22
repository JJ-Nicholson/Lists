import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../test/render";
import ListControls from "./ListControls";

const defaultProps: ComponentProps<typeof ListControls> = {
    disabled: false,
    hasCompletedItems: true,
    hasIncompleteItems: true,
    onMarkAllItemsComplete: () => {},
    onMarkAllItemsIncomplete: () => {},
    onSearchChange: () => {},
    onSortByChange: () => {},
    onSortDirectionChange: () => {},
    onStatusChange: () => {},
};

function renderControls(
    overrides: Partial<ComponentProps<typeof ListControls>> = {},
) {
    return render(<ListControls {...defaultProps} {...overrides} />);
}

describe("ListControls", () => {
    it("renders the current control values and amount label", () => {
        renderControls({
            search: "milk",
            sortBy: "amount",
            sortDirection: "desc",
            status: "completed",
            unitLabel: "$",
        });

        expect(screen.getByLabelText("Search")).toHaveValue("milk");
        expect(screen.getByLabelText("Filter by")).toHaveValue("completed");
        expect(screen.getByLabelText("Sort by")).toHaveValue("amount");
        expect(screen.getByRole("option", { name: "Price" }))
            .toBeInTheDocument();
        expect(screen.getByLabelText("Sort direction")).toHaveValue("desc");
    });

    it("calls control and bulk action callbacks", async () => {
        const callbacks = {
            onMarkAllItemsComplete: vi.fn(),
            onMarkAllItemsIncomplete: vi.fn(),
            onSearchChange: vi.fn(),
            onSortByChange: vi.fn(),
            onSortDirectionChange: vi.fn(),
            onStatusChange: vi.fn(),
        };
        const { user } = renderControls(callbacks);

        fireEvent.change(screen.getByLabelText("Search"), {
            target: { value: "milk" },
        });
        await user.selectOptions(screen.getByLabelText("Filter by"), "active");
        await user.selectOptions(screen.getByLabelText("Sort by"), "status");
        await user.selectOptions(
            screen.getByLabelText("Sort direction"),
            "desc",
        );
        await user.click(
            screen.getByRole("button", { name: "Tick All Entries" }),
        );
        await user.click(
            screen.getByRole("button", { name: "Untick All Entries" }),
        );

        expect(callbacks.onSearchChange).toHaveBeenCalledWith("milk");
        expect(callbacks.onStatusChange).toHaveBeenCalledWith("active");
        expect(callbacks.onSortByChange).toHaveBeenCalledWith("status");
        expect(callbacks.onSortDirectionChange).toHaveBeenCalledWith("desc");
        expect(callbacks.onMarkAllItemsComplete).toHaveBeenCalledOnce();
        expect(callbacks.onMarkAllItemsIncomplete).toHaveBeenCalledOnce();
    });

    it("uses filtered bulk labels and supports disabling only bulk actions", () => {
        renderControls({ bulkActionsDisabled: true, isFiltered: true });

        expect(
            screen.getByRole("button", { name: "Tick Filtered Entries" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Untick Filtered Entries" }),
        ).toBeDisabled();
        expect(screen.getByLabelText("Search")).toBeEnabled();
    });

    it("disables all controls", () => {
        renderControls({ disabled: true });

        expect(screen.getByLabelText("Search")).toBeDisabled();
        expect(screen.getByLabelText("Filter by")).toBeDisabled();
        expect(screen.getByLabelText("Sort by")).toBeDisabled();
        expect(screen.getByLabelText("Sort direction")).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Tick All Entries" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Untick All Entries" }),
        ).toBeDisabled();
    });
});
