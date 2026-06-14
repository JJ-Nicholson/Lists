import { describe, expect, it, vi } from "vitest";

import type { ListSummary } from "../../api/lists";
import { render, screen } from "../../test/render";
import ListCard from "./ListCard";

function createList(overrides: Partial<ListSummary> = {}): ListSummary {
    return {
        id: 1,
        name: "Groceries",
        unitLabel: "items",
        version: 1,
        itemCount: 5,
        completedItemCount: 2,
        currentUserRole: "owner",
        ownerUsername: "josh",
        ...overrides,
    };
}

describe("ListCard", () => {
    it("renders list details for an owned list", () => {
        render(<ListCard list={createList()} />);

        expect(
            screen.getByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(screen.getByText("2 of 5 items completed")).toBeInTheDocument();
        expect(screen.getByText("Units: items")).toBeInTheDocument();
        expect(screen.getByText("You own this list")).toBeInTheDocument();
    });

    it("renders shared list owner and role details", () => {
        render(
            <ListCard
                list={createList({
                    currentUserRole: "editor",
                    ownerUsername: "sarah",
                })}
            />,
        );

        expect(screen.getByText("Owner: sarah")).toBeInTheDocument();
        expect(screen.getByText("Role: editor")).toBeInTheDocument();
    });

    it("renders none when a list does not have a unit label", () => {
        render(<ListCard list={createList({ unitLabel: null })} />);

        expect(screen.getByText("Units: none")).toBeInTheDocument();
    });

    it("links to the list detail page when enabled", () => {
        render(<ListCard list={createList({ id: 42 })} />);

        expect(
            screen.getByRole("link", { name: "Open Groceries" }),
        ).toHaveAttribute("href", "/lists/42");
    });

    it("does not link to the list detail page when disabled", () => {
        render(<ListCard disabled list={createList()} />);

        expect(
            screen.queryByRole("link", { name: "Open Groceries" }),
        ).not.toBeInTheDocument();
    });

    it("renders owner actions", () => {
        render(<ListCard list={createList()} />);

        expect(
            screen.getByRole("button", { name: "Review access to Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Edit Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Delete Groceries" }),
        ).toBeInTheDocument();
    });

    it("renders editor actions without delete", () => {
        render(
            <ListCard list={createList({ currentUserRole: "editor" })} />,
        );

        expect(
            screen.getByRole("button", { name: "Review access to Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Edit Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Delete Groceries" }),
        ).not.toBeInTheDocument();
    });

    it("does not render actions for an unknown role", () => {
        render(
            <ListCard list={createList({ currentUserRole: "viewer" })} />,
        );

        expect(
            screen.queryByRole("button", { name: "Review access to Groceries" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Edit Groceries" }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Delete Groceries" }),
        ).not.toBeInTheDocument();
    });

    it("calls action callbacks with the list", async () => {
        const list = createList();
        const onReviewAccess = vi.fn();
        const onEditList = vi.fn();
        const onDeleteList = vi.fn();
        const { user } = render(
            <ListCard
                list={list}
                onDeleteList={onDeleteList}
                onEditList={onEditList}
                onReviewAccess={onReviewAccess}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: "Review access to Groceries" }),
        );
        await user.click(screen.getByRole("button", { name: "Edit Groceries" }));
        await user.click(
            screen.getByRole("button", { name: "Delete Groceries" }),
        );

        expect(onReviewAccess).toHaveBeenCalledWith(list);
        expect(onEditList).toHaveBeenCalledWith(list);
        expect(onDeleteList).toHaveBeenCalledWith(list);
    });
});
