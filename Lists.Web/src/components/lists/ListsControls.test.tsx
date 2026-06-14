import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../test/render";
import ListsControls from "./ListsControls";

describe("ListsControls", () => {
    it("renders the current search and sort values", () => {
        render(<ListsControls search="groceries" sortDirection="desc" />);

        expect(screen.getByLabelText("Search")).toHaveValue("groceries");
        expect(screen.getByLabelText("Sort alphabetically")).toHaveValue("desc");
    });

    it("calls onSearchChange when the search input changes", () => {
        const onSearchChange = vi.fn();
        render(<ListsControls onSearchChange={onSearchChange} />);

        fireEvent.change(screen.getByLabelText("Search"), {
            target: { value: "groceries" },
        });

        expect(onSearchChange).toHaveBeenCalledWith("groceries");
    });

    it("calls onSortDirectionChange when the sort direction changes", () => {
        const onSortDirectionChange = vi.fn();
        render(
            <ListsControls
                onSortDirectionChange={onSortDirectionChange}
            />,
        );

        fireEvent.change(screen.getByLabelText("Sort alphabetically"), {
            target: { value: "desc" },
        });

        expect(onSortDirectionChange).toHaveBeenCalledWith("desc");
    });

    it("does not call callbacks when disabled", async () => {
        const onSearchChange = vi.fn();
        const onSortDirectionChange = vi.fn();
        const { user } = render(
            <ListsControls
                disabled
                onSearchChange={onSearchChange}
                onSortDirectionChange={onSortDirectionChange}
            />,
        );

        await user.type(screen.getByLabelText("Search"), "groceries");
        await user.selectOptions(
            screen.getByLabelText("Sort alphabetically"),
            "desc",
        );

        expect(onSearchChange).not.toHaveBeenCalled();
        expect(onSortDirectionChange).not.toHaveBeenCalled();
    });
});
