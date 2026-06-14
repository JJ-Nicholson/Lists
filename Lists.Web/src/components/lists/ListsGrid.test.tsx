import { describe, expect, it, vi } from "vitest";

import type { ListSummary } from "../../api/lists";
import { render, screen } from "../../test/render";
import ListsGrid from "./ListsGrid";

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

function renderListsGrid(lists: ListSummary[] = []) {
    return render(
        <ListsGrid
            lists={lists}
            onDeleteList={() => {}}
            onEditList={() => {}}
            onReviewAccess={() => {}}
        />,
    );
}

describe("ListsGrid", () => {
    it("shows a loading message while lists are loading", () => {
        render(
            <ListsGrid
                isLoading
                lists={[]}
                onDeleteList={() => {}}
                onEditList={() => {}}
                onReviewAccess={() => {}}
            />,
        );

        expect(screen.getByText("Loading lists...")).toBeInTheDocument();
    });

    it("renders nothing when lists have not loaded and are not loading", () => {
        const { container } = render(
            <ListsGrid
                hasLoadedLists={false}
                lists={[]}
                onDeleteList={() => {}}
                onEditList={() => {}}
                onReviewAccess={() => {}}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("shows an empty state when there are no lists", () => {
        renderListsGrid();

        expect(screen.getByText("No lists here!")).toBeInTheDocument();
    });

    it("renders a card for each list", () => {
        renderListsGrid([
            createList({ id: 1, name: "Groceries" }),
            createList({ id: 2, name: "Hardware" }),
        ]);

        expect(
            screen.getByRole("heading", { name: "Groceries" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Hardware" }),
        ).toBeInTheDocument();
    });

    it("passes action callbacks to list cards", async () => {
        const list = createList();
        const onDeleteList = vi.fn();
        const onEditList = vi.fn();
        const onReviewAccess = vi.fn();
        const { user } = render(
            <ListsGrid
                lists={[list]}
                onDeleteList={onDeleteList}
                onEditList={onEditList}
                onReviewAccess={onReviewAccess}
            />,
        );

        await user.click(
            screen.getByRole("button", { name: "Review access to Groceries" }),
        );
        await user.click(screen.getByRole("button", { name: "Edit Groceries" }));
        await user.click(screen.getByRole("button", { name: "Delete Groceries" }));

        expect(onReviewAccess).toHaveBeenCalledWith(list);
        expect(onEditList).toHaveBeenCalledWith(list);
        expect(onDeleteList).toHaveBeenCalledWith(list);
    });
});
